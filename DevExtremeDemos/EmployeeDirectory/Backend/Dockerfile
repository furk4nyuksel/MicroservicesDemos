FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["EmployeeDirectory.Api/EmployeeDirectory.Api.csproj", "EmployeeDirectory.Api/"]
COPY ["EmployeeDirectory.Application/EmployeeDirectory.Application.csproj", "EmployeeDirectory.Application/"]
COPY ["EmployeeDirectory.Domain/EmployeeDirectory.Domain.csproj", "EmployeeDirectory.Domain/"]
COPY ["EmployeeDirectory.Infrastructure/EmployeeDirectory.Infrastructure.csproj", "EmployeeDirectory.Infrastructure/"]

RUN dotnet restore "EmployeeDirectory.Api/EmployeeDirectory.Api.csproj"

COPY . .
WORKDIR "/src/EmployeeDirectory.Api"
RUN dotnet build "EmployeeDirectory.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "EmployeeDirectory.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "EmployeeDirectory.Api.dll"]
