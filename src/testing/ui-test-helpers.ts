import { type ComponentFixture } from '@angular/core/testing';

export function hostOf<T>(fixture: ComponentFixture<T>): HTMLElement {
  const host: unknown = fixture.nativeElement;
  if (!(host instanceof HTMLElement)) throw new Error('Expected an HTML host');
  return host;
}

export function inputOf(host: HTMLElement, name: string): HTMLInputElement {
  const input = host.querySelector(`input[id="${name}"]`);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Expected input ${name}`);
  return input;
}

export async function fill<T>(
  fixture: ComponentFixture<T>,
  values: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [name, value] of Object.entries(values)) {
    const input = inputOf(hostOf(fixture), name);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  await fixture.whenStable();
}

export async function submit<T>(fixture: ComponentFixture<T>): Promise<void> {
  const form = hostOf(fixture).querySelector('form');
  if (!(form instanceof HTMLFormElement)) throw new Error('Expected a form');
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await fixture.whenStable();
}
