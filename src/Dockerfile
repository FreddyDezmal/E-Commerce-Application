# ECommerceApi - production container (Milestone 6)
# Build context is the src/ folder:  docker build -t ecommerce-api src
# Render builds this automatically from render.yaml.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app
COPY ECommerceApi.csproj ./
RUN dotnet restore ECommerceApi.csproj
COPY . ./
RUN dotnet publish ECommerceApi.csproj -c Release -o /out --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /out ./

# Production disables Swagger and enables HTTPS redirection (Program.cs).
# FORWARDEDHEADERS_ENABLED makes ASP.NET trust X-Forwarded-For/-Proto from
# Render's proxy. Without it every request appears to come from the proxy's
# IP, so the per-IP auth rate limiter collapses back into one global bucket.
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true \
    PORT=8080

# Non-root user shipped with the .NET 8 images.
USER app
EXPOSE 8080
CMD ["sh", "-c", "exec dotnet ECommerceApi.dll --urls http://0.0.0.0:${PORT}"]
