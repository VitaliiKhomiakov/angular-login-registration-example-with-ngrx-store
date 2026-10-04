import { TestBed } from '@angular/core/testing';
import { hostOf } from '../../../../../../testing/ui-test-helpers';
import { TaskItem } from './task-item';

describe('Task row intent', () => {
  it.each([true, false])(
    'keeps keyboard focus through a save (confirmed: %s) without stealing a newer target',
    async (confirmed) => {
      TestBed.configureTestingModule({ imports: [TaskItem] });
      const fixture = TestBed.createComponent(TaskItem);
      fixture.componentRef.setInput('task', { id: 1, title: 'Review', completed: false });
      await fixture.whenStable();
      const host = hostOf(fixture);
      const button = host.querySelector('button');
      if (!(button instanceof HTMLButtonElement)) throw new Error('Expected task action button');
      button.focus();
      button.click();
      fixture.componentRef.setInput('disabled', true);
      await fixture.whenStable();
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.disabled).toBe(false);
      expect(document.activeElement).toBe(button);
      fixture.componentRef.setInput('task', { id: 1, title: 'Review', completed: confirmed });
      fixture.componentRef.setInput('disabled', false);
      await fixture.whenStable();
      expect(document.activeElement).toBe(button);
      expect(button.getAttribute('aria-disabled')).not.toBe('true');

      button.click();
      fixture.componentRef.setInput('disabled', true);
      await fixture.whenStable();
      const other = document.createElement('button');
      other.textContent = 'Filter';
      host.append(other);
      other.focus();
      fixture.componentRef.setInput('disabled', false);
      await fixture.whenStable();
      expect(document.activeElement).toBe(other);
      other.remove();
    },
  );

  it('renders confirmed data, emits the opposite completion and suppresses disabled clicks', async () => {
    TestBed.configureTestingModule({ imports: [TaskItem] });
    const fixture = TestBed.createComponent(TaskItem);
    fixture.componentRef.setInput('task', { id: 1, title: 'Review', completed: false });
    const emitted: boolean[] = [];
    fixture.componentInstance.completionChanged.subscribe((value) => emitted.push(value));
    await fixture.whenStable();
    const host = hostOf(fixture);
    expect(host.textContent).toContain('Review');
    const button = host.querySelector('button');
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected task action button');
    expect(button.getAttribute('aria-label')).toBe('Mark complete: Review');
    button.click();
    expect(emitted).toEqual([true]);
    expect(host.querySelector('[data-testid="task-completion"]')?.textContent).toBe('Active');
    fixture.componentRef.setInput('task', { id: 1, title: 'Review', completed: true });
    await fixture.whenStable();
    expect(button.getAttribute('aria-label')).toBe('Mark active: Review');
    button.click();
    expect(emitted).toEqual([true, false]);
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    button.click();
    expect(emitted).toEqual([true, false]);
    fixture.componentRef.setInput('disabled', false);
    await fixture.whenStable();
    button.click();
    expect(emitted).toEqual([true, false, false]);
  });
});
