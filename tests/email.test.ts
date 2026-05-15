import { describe, expect, it } from "vitest";
import { renderRankingChangeEmail } from "../lib/email.js";

describe("renderRankingChangeEmail", () => {
  it("counts gains and losses in the subject", () => {
    const out = renderRankingChangeEmail({
      domain: "example.com",
      rows: [
        { keyword: "a", oldPosition: 10, newPosition: 5 },  // up
        { keyword: "b", oldPosition: 5,  newPosition: 12 }, // down
        { keyword: "c", oldPosition: 3,  newPosition: 1 },  // up
      ],
    });
    expect(out.subject).toBe("example.com: 2 up, 1 down");
  });

  it("escapes HTML in keyword names so injection is impossible", () => {
    const out = renderRankingChangeEmail({
      domain: "example.com",
      rows: [{ keyword: '<script>alert("xss")</script>', oldPosition: 10, newPosition: 5 }],
    });
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
  });

  it("emits a plaintext fallback", () => {
    const out = renderRankingChangeEmail({
      domain: "example.com",
      rows: [{ keyword: "k", oldPosition: 10, newPosition: 3 }],
    });
    expect(out.text).toContain("k");
    expect(out.text).toContain("10");
    expect(out.text).toContain("3");
  });
});
