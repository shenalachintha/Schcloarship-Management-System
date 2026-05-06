using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScholarshipManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentBatchInfo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Batch",
                table: "GovernmentScholarshipLists",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Specialization",
                table: "GovernmentScholarshipLists",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Batch",
                table: "GovernmentScholarshipLists");

            migrationBuilder.DropColumn(
                name: "Specialization",
                table: "GovernmentScholarshipLists");
        }
    }
}
