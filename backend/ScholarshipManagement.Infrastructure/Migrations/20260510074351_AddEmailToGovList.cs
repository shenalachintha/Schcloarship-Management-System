using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScholarshipManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailToGovList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "GovernmentScholarshipLists",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Email",
                table: "GovernmentScholarshipLists");
        }
    }
}
