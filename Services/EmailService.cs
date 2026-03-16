namespace PharmacyApi.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string email, string subject, string message);
    }

    public class FileEmailService : IEmailService
    {
        private readonly string _logPath;

        public FileEmailService()
        {
            _logPath = Path.Combine(Directory.GetCurrentDirectory(), "App_Data", "Logs", "Emails.txt");
            var directory = Path.GetDirectoryName(_logPath);
            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory!);
            }
        }

        public async Task SendEmailAsync(string email, string subject, string message)
        {
            var emailLog = $"--------------------------------------------------\n" +
                           $"Date: {DateTime.Now}\n" +
                           $"To: {email}\n" +
                           $"Subject: {subject}\n" +
                           $"Message: {message}\n" +
                           $"--------------------------------------------------\n\n";

            await File.AppendAllTextAsync(_logPath, emailLog);
        }
    }
}
