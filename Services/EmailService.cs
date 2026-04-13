using System.Net;
using System.Net.Mail;

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

    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public SmtpEmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendEmailAsync(string email, string subject, string message)
        {
            var smtpSettings = _configuration.GetSection("SmtpSettings");
            var host = smtpSettings["Host"];
            var port = int.Parse(smtpSettings["Port"] ?? "587");
            var enableSsl = bool.Parse(smtpSettings["EnableSsl"] ?? "true");
            var username = smtpSettings["Username"];
            var password = smtpSettings["Password"];
            var senderEmail = smtpSettings["SenderEmail"];
            var senderName = smtpSettings["SenderName"];

            using (var client = new SmtpClient(host, port))
            {
                client.Credentials = new NetworkCredential(username, password);
                client.EnableSsl = enableSsl;

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(senderEmail!, senderName),
                    Subject = subject,
                    Body = message,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(email);

                await client.SendMailAsync(mailMessage);
            }
        }
    }
}
