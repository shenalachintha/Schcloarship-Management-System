using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScholarshipManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RestoreRegNumAndNIC : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GovernmentScholarshipLists_RegistrationNumber",
                table: "GovernmentScholarshipLists");

            migrationBuilder.AlterColumn<string>(
                name: "RegistrationNumber",
                table: "GovernmentScholarshipLists",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<string>(
                name: "NIC",
                table: "GovernmentScholarshipLists",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_GovernmentScholarshipLists_NIC",
                table: "GovernmentScholarshipLists",
                column: "NIC",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_GovernmentScholarshipLists_NIC",
                table: "GovernmentScholarshipLists");

            migrationBuilder.DropColumn(
                name: "NIC",
                table: "GovernmentScholarshipLists");

            migrationBuilder.AlterColumn<string>(
                name: "RegistrationNumber",
                table: "GovernmentScholarshipLists",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_GovernmentScholarshipLists_RegistrationNumber",
                table: "GovernmentScholarshipLists",
                column: "RegistrationNumber",
                unique: true);
        }
    }
}
