import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, map, type Observable } from 'rxjs';
import { apiRequestContext } from '../../../../http/api-request-context';
import type { Task, TaskCompletionRequest } from './task-contracts';
import { decodeTask, decodeTasks, TasksApiContractError } from './task-decoders';

@Injectable({ providedIn: 'root' })
export class TasksApi {
  private readonly http = inject(HttpClient);

  public list(): Observable<readonly Task[]> {
    return this.http
      .get<unknown>('/tasks', {
        context: apiRequestContext('authenticated'),
      })
      .pipe(map(decodeTasks));
  }

  public setCompleted(id: number, request: TaskCompletionRequest): Observable<Task> {
    return defer(() => {
      if (!Number.isSafeInteger(id) || id <= 0 || typeof request.completed !== 'boolean') {
        throw new TasksApiContractError();
      }
      const completed = request.completed;
      return this.http
        .patch<unknown>(
          `/tasks/${id}`,
          { completed },
          {
            context: apiRequestContext('authenticated'),
          },
        )
        .pipe(
          map((value) => {
            const task = decodeTask(value);
            if (task.id !== id || task.completed !== completed) throw new TasksApiContractError();
            return task;
          }),
        );
    });
  }
}
