import { createFeature } from '@ngrx/store';
import { tasksReducer } from './tasks-reducer';

export const tasksFeature = createFeature({ name: 'tasks', reducer: tasksReducer });
