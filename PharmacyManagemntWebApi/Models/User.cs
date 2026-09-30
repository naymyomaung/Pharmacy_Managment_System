namespace PharmacyManagemntWebApi.Models
{
    public class User
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Cashier"; // Admin, Pharmacist, Cashier
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
