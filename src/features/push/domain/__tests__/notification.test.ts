import { cheerNotification } from "../notification";

describe("cheerNotification", () => {
  const maria = { name: "Maria Santos", username: "maria" };
  const ben = { name: "Ben", username: "ben" };
  const cara = { name: "Cara", username: "cara" };

  it("names one sender", () => {
    expect(cheerNotification([maria])?.title).toBe("Maria is cheering you on");
  });

  it("names two senders", () => {
    expect(cheerNotification([maria, ben])?.title).toBe(
      "Maria and Ben are cheering you on",
    );
  });

  it("says others with no number for three or more", () => {
    const title = cheerNotification([maria, ben, cara])?.title;
    expect(title).toBe("Maria, Ben and others are cheering you on");
    expect(title).not.toMatch(/\d/);
  });

  it("falls back to the username for a blank name", () => {
    expect(cheerNotification([{ name: " ", username: "maria" }])?.title).toBe(
      "@maria is cheering you on",
    );
  });

  it("returns null for no senders", () => {
    expect(cheerNotification([])).toBeNull();
  });

  it("uses the fixed tag, icon and url", () => {
    const notification = cheerNotification([maria]);
    expect(notification).toMatchObject({
      tag: "cheers",
      renotify: true,
      icon: "/icons/icon-192.png",
      data: { url: "/" },
    });
    expect(Object.keys(notification ?? {}).sort()).toEqual([
      "data",
      "icon",
      "renotify",
      "tag",
      "title",
    ]);
  });
});
