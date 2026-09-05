using System.Text;
using ECommerceApi.Authentication;
using ECommerceApi.Data;
using ECommerceApi.Middleware;
using ECommerceApi.Repositories.Implementations;
using ECommerceApi.Repositories.Interfaces;
using ECommerceApi.Services.Implementations;
using ECommerceApi.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Configuration ───────────────────────────────────────────
// Connection string, JWT key, and CORS origins all come from
// configuration/environment variables, never hard-coded
// (Milestone 2 §10). In production, override via environment variables:
//   ConnectionStrings__DefaultConnection, Jwt__Key, Jwt__Issuer,
//   Jwt__Audience, Jwt__ExpiryMinutes, Cors__AllowedOrigins__0
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection is not configured. Copy appsettings.Development.example.json " +
        "to appsettings.Development.json (gitignored) and fill in a real value, or set the " +
        "ConnectionStrings__DefaultConnection environment variable.");
}

// ── Database ─────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// ── Repositories (the only layer touching AppDbContext) ────────
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ICartRepository, CartRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();

// ── Services (business logic; depend only on repository interfaces) ─
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<IOrderService, OrderService>();

// ── Auth infrastructure ─────────────────────────────────────
builder.Services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();

var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
var jwtKey = jwtSection["Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "Jwt:Key is not configured. Copy appsettings.Development.example.json to " +
        "appsettings.Development.json (gitignored) and fill in a real value, or set the " +
        "Jwt__Key environment variable.");
}

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

// ── CORS (Milestone 2 §28 — never AllowAnyOrigin in production) ────
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ── Rate limiting (Milestone 2 §17/§34 — brute-force mitigation on auth) ─
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 20;
        opt.Window = TimeSpan.FromMinutes(15);
        opt.QueueLimit = 0;
    });
});

// ── Controllers, validation, Swagger ─────────────────────────
builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "SEN371 E-Commerce API", Version = "v1" });

    // JWT auth in Swagger UI (Milestone 2 §29) so protected endpoints can
    // be exercised directly from /swagger during development.
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a JWT access token (no 'Bearer ' prefix needed — Swagger adds it)."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

// ── Health checks (Milestone 2 §30 — includes DB connectivity) ─────
builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString, name: "postgresql");

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

// Exposed for WebApplicationFactory<Program> in integration tests
// (Milestone 2 §33).
public partial class Program { }
