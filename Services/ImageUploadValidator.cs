namespace PharmacyApi.Services;

/// <summary>
/// Shared fail-closed image upload validator enforcing extension, MIME type, size limit, and binary magic-byte checks.
/// </summary>
public static class ImageUploadValidator
{
    public const long DefaultMaxImageBytes = 2 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp"
    };

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/jpg", "image/png", "image/webp"
    };

    public static async Task<(bool IsValid, string? ErrorMessage, string Extension)> ValidateAsync(
        IFormFile? file,
        long maxBytes = DefaultMaxImageBytes,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            return (false, "কোনো ফাইল আপলোড হয়নি।", string.Empty);

        if (file.Length > maxBytes)
            return (false, $"ইমেজ সাইজ সর্বোচ্চ {maxBytes / (1024 * 1024)}MB হতে পারবে।", string.Empty);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext) ||
            (!string.IsNullOrEmpty(file.ContentType) && !AllowedContentTypes.Contains(file.ContentType)))
        {
            return (false, "শুধুমাত্র .jpg, .jpeg, .png অথবা .webp ইমেজ অনুমোদিত।", string.Empty);
        }

        byte[] header = new byte[12];
        int bytesRead;
        await using (var peek = file.OpenReadStream())
        {
            bytesRead = await peek.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);
        }

        bool validMagic =
            (ext is ".jpg" or ".jpeg" && bytesRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) ||
            (ext == ".png" && bytesRead >= 8 &&
                header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A) ||
            (ext == ".webp" && bytesRead >= 12 &&
                header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50);

        if (!validMagic)
            return (false, "ফাইলটির ভেতরের ইমেজ ফরম্যাট এক্সটেনশনের সাথে মেলে না।", string.Empty);

        return (true, null, ext);
    }

    public static async Task<string> SaveToWebRootAsync(
        IFormFile file,
        IWebHostEnvironment env,
        string fileName,
        CancellationToken cancellationToken = default,
        params string[] relativeSubFolders)
    {
        var webRoot = string.IsNullOrWhiteSpace(env.WebRootPath)
            ? Path.Combine(env.ContentRootPath, "wwwroot")
            : env.WebRootPath;

        var safeName = Path.GetFileName(fileName);
        var parts = new List<string> { webRoot };
        parts.AddRange(relativeSubFolders);

        var folder = Path.Combine(parts.ToArray());
        Directory.CreateDirectory(folder);

        var filePath = Path.Combine(folder, safeName);
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var urlSegment = string.Join("/", relativeSubFolders.Select(p => p.Trim('/', '\\')));
        return $"/{urlSegment}/{safeName}";
    }
}
