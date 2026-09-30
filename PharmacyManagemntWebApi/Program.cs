using Microsoft.Extensions.DependencyInjection.Extensions;
using PharmacyManagemntWebApi.Data;
using PharmacyManagemntWebApi.Repository;
using System.Net;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<IDbConnectionFactory, DbConnectionFactory>();
builder.Services.AddScoped<UnitRepo>();
builder.Services.AddScoped<UserRepo>();
builder.Services.AddScoped<DrugRepo>();
builder.Services.AddScoped<DrugConversionRepo>();
builder.Services.AddScoped<SupplierRepo>();
builder.Services.AddScoped<PurchaseRepo>();
builder.Services.AddScoped<SaleRepo>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.SetIsOriginAllowed(origin =>
              {
                  if (string.IsNullOrWhiteSpace(origin)) return false;
                  try
                  {
                      var u = new Uri(origin);
                      // Allow localhost / 127.0.0.1 (any port)
                      if ((u.Host == "localhost" || u.Host == "127.0.0.1")
                          && (u.Scheme == "http" || u.Scheme == "https"))
                          return true;
                      // Allow private LAN IPs (10.x, 192.168.x, 172.16-31.x) for dev
                      if (IPAddress.TryParse(u.Host, out var ip))
                      {
                          var bytes = ip.GetAddressBytes();
                          if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                          {
                              // 10.0.0.0/8
                              if (bytes[0] == 10) return true;
                              // 192.168.0.0/16
                              if (bytes[0] == 192 && bytes[1] == 168) return true;
                              // 172.16.0.0/12
                              if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
                          }
                      }
                      return false;
                  }
                  catch { return false; }
              })
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("Frontend");

app.UseAuthorization();

app.MapControllers();

app.Run();
