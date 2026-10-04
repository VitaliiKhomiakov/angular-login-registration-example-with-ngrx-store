import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { Task } from '../../data-access/task-contracts';

@Component({
  selector: 'app-task-item',
  imports: [MatButtonModule],
  templateUrl: './task-item.html',
  styleUrl: './task-item.scss',
})
export class TaskItem {
  readonly task = input.required<Task>();
  readonly disabled = input(false);
  readonly completionChanged = output<boolean>();

  changeCompletion(): void {
    // Material keeps the pending button focusable; suppress its action here.
    if (this.disabled()) return;
    this.completionChanged.emit(!this.task().completed);
  }
}
