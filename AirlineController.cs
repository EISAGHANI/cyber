using System;
using System.Data.SqlClient;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace FlightAI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AirlineController : ControllerBase
    {
        private const string ConnectionString = "Server=prod-sql.flightai.local;Database=Bookings;User Id=sa;Password=SuperSecretPassword123!;";
        private const string JwtSigningSecret = "flightai-hardcoded-jwt-secret-key-2026";

        [HttpGet("price")]
        public IActionResult GetTicketPrice([FromQuery] string city)
        {
            using var connection = new SqlConnection(ConnectionString);
            connection.Open();

            // Vulnerable: SQL Injection via string interpolation
            var query = $"SELECT Price FROM TicketPrices WHERE City = '{city}'";
            using var command = new SqlCommand(query, connection);
            var result = command.ExecuteScalar();

            return Ok(new { city, price = result });
        }

        [HttpPost("preferences")]
        public IActionResult ImportPreferences([FromBody] string rawJson)
        {
            // Vulnerable: Insecure deserialization with TypeNameHandling.All
            var settings = new JsonSerializerSettings
            {
                TypeNameHandling = TypeNameHandling.All
            };
            var prefs = JsonConvert.DeserializeObject(rawJson, settings);
            return Ok(prefs);
        }

        [HttpGet("invoice")]
        public IActionResult DownloadInvoice([FromQuery] string fileName)
        {
            // Vulnerable: Path traversal (Path.Combine allows rooted paths or ../ sequences)
            var filePath = Path.Combine("/var/app/invoices", fileName);
            var bytes = System.IO.File.ReadAllBytes(filePath);
            return File(bytes, "application/pdf", fileName);
        }

        [HttpPost("diagnostics")]
        public IActionResult RunPing([FromQuery] string host)
        {
            // Vulnerable: OS command injection
            var process = Process.Start(new ProcessStartInfo
            {
                FileName = "/bin/sh",
                Arguments = $"-c \"ping -c 1 {host}\"",
                RedirectStandardOutput = true,
                UseShellExecute = false
            });
            var output = process?.StandardOutput.ReadToEnd();
            return Ok(new { output });
        }

        public static string HashPassword(string password)
        {
            // Vulnerable: Weak MD5 hashing without salt
            using var md5 = MD5.Create();
            var hashBytes = md5.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToHexString(hashBytes);
        }
    }
}
