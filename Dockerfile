FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy csproj files and restore dependencies
COPY ["backend/SchoolERP.Domain/SchoolERP.Domain.csproj", "backend/SchoolERP.Domain/"]
COPY ["backend/SchoolERP.Application/SchoolERP.Application.csproj", "backend/SchoolERP.Application/"]
COPY ["backend/SchoolERP.Infrastructure/SchoolERP.Infrastructure.csproj", "backend/SchoolERP.Infrastructure/"]
COPY ["backend/SchoolERP.API/SchoolERP.API.csproj", "backend/SchoolERP.API/"]

RUN dotnet restore "backend/SchoolERP.API/SchoolERP.API.csproj"

# Copy full source and build
COPY . .
WORKDIR "/app/backend/SchoolERP.API"
RUN dotnet publish "SchoolERP.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "SchoolERP.API.dll"]
