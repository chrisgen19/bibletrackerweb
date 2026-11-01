import { fireEvent, render, screen } from "@testing-library/react";

import type { FriendProfile } from "../../domain/types";
import { CheeringRow } from "../cheering-row";

const person = (name: string): FriendProfile => ({
  userId: `id-${name}`,
  username: name.toLowerCase(),
  name: `${name} Smith`,
  image: null,
});

const text = () => screen.getByTestId("cheering-text").textContent;

describe("CheeringRow", () => {
  it("names one sender", () => {
    render(<CheeringRow senders={[person("Maria")]} onDismiss={vi.fn()} />);
    expect(text()).toBe("Maria is cheering you on");
  });

  it("names two senders", () => {
    render(
      <CheeringRow
        senders={[person("Maria"), person("Ben")]}
        onDismiss={vi.fn()}
      />,
    );
    expect(text()).toBe("Maria and Ben are cheering you on");
  });

  it("says others, with no count, for more than two", () => {
    const { container } = render(
      <CheeringRow
        senders={[person("Maria"), person("Ben"), person("Cal"), person("Dee")]}
        onDismiss={vi.fn()}
      />,
    );
    expect(text()).toBe("Maria, Ben and others are cheering you on");
    expect(container.textContent).not.toMatch(/\d/);
  });

  it("puts the names in strong", () => {
    const { container } = render(
      <CheeringRow
        senders={[person("Maria"), person("Ben")]}
        onDismiss={vi.fn()}
      />,
    );
    const strong = [...container.querySelectorAll("strong")].map(
      (el) => el.textContent,
    );
    expect(strong).toEqual(["Maria", "Ben"]);
  });

  it("shows at most two avatars", () => {
    const { container } = render(
      <CheeringRow
        senders={[person("Maria"), person("Ben"), person("Cal")]}
        onDismiss={vi.fn()}
      />,
    );
    expect(container.querySelectorAll("span[aria-hidden='true']").length).toBe(
      2,
    );
  });

  it("dismisses from the labelled X", () => {
    const onDismiss = vi.fn();
    render(<CheeringRow senders={[person("Maria")]} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders children under the names", () => {
    render(
      <CheeringRow senders={[person("Maria")]} onDismiss={vi.fn()}>
        <p>Want these on your lock screen?</p>
      </CheeringRow>,
    );
    expect(screen.getByText("Want these on your lock screen?")).not.toBeNull();
    expect(text()).toBe("Maria is cheering you on");
  });

  it("the X dismisses without touching the question count", () => {
    const onDismiss = vi.fn();
    window.localStorage.setItem("push-not-now-count", "1");
    render(<CheeringRow senders={[person("Maria")]} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("push-not-now-count")).toBe("1");
  });

  it("renders nothing without senders", () => {
    const { container } = render(
      <CheeringRow senders={[]} onDismiss={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
