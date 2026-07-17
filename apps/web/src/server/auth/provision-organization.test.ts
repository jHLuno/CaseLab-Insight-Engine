import { describe, expect, it, vi } from "vitest";
import { provisionOrganization } from "./provision-organization";

describe("provisionOrganization", () => {
  it("creates exactly one owner organization for a new user", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: "f0cb8e72-4717-4e6a-92b9-915fa80bc125",
      error: null
    });
    const client = { rpc };

    const firstOrganizationId = await provisionOrganization(
      "3a62f5d3-4056-4603-9676-f338aa8a8c28",
      "researcher@example.com",
      client
    );
    const secondOrganizationId = await provisionOrganization(
      "3a62f5d3-4056-4603-9676-f338aa8a8c28",
      "researcher@example.com",
      client
    );

    expect(firstOrganizationId).toBe(secondOrganizationId);
    expect(rpc).toHaveBeenCalledWith("provision_personal_organization", {
      owner_email: "researcher@example.com",
      owner_user_id: "3a62f5d3-4056-4603-9676-f338aa8a8c28"
    });
  });
});
