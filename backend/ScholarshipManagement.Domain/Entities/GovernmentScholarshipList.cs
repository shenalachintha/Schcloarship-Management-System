namespace ScholarshipManagement.Domain.Entities;

public class GovernmentScholarshipList
{
    public int Id { get; set; }
    public string RegistrationNumber { get; set; } = string.Empty;
    public string NIC { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Faculty { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Batch { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string? ScholarshipType { get; set; } // Mahapola, Bursary (Assigned by Staff)
    public string Status { get; set; } = "Pending"; // Pending, Assigned
    public DateTime ApprovedDate { get; set; }
    public string Remarks { get; set; } = string.Empty;
}
