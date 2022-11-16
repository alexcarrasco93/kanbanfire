import {
  CdkDragDrop,
  CdkDropList,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  TaskDialogComponent,
  TaskDialogResult,
} from './task-dialog/task-dialog.component';
import { Task } from './task/task';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

const getObservable = (collection: AngularFirestoreCollection<Task>) => {
  const subject = new BehaviorSubject<Task[]>([]);
  collection.valueChanges({ idField: 'id' }).subscribe((val: Task[]) => {
    subject.next(val);
  });
  return subject;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  todo$: Observable<Task[]> = getObservable(this.afs.collection<Task>('todo'));
  inProgress$: Observable<Task[]> = getObservable(this.afs.collection<Task>('inProgress'));
  done$: Observable<Task[]> = getObservable(this.afs.collection<Task>('done'));

  constructor(private dialog: MatDialog, private afs: AngularFirestore) {}

  newTask(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {},
      },
    });
    dialogRef
      .afterClosed()
      .subscribe((result: TaskDialogResult | undefined) => {
        if (!result) {
          return;
        }
        this.afs.collection('todo').add(result.task);
      });
  }

  editTask(list: 'done' | 'todo' | 'inProgress', task: Task): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task,
        enableDelete: true,
      },
    });
    dialogRef
      .afterClosed()
      .subscribe((result: TaskDialogResult | undefined) => {
        if (!result) {
          return;
        }
        if (result.delete) {
          this.afs.collection(list).doc(task.id).delete();
        } else {
          this.afs.collection(list).doc(task.id).update(task);
        }
      });
  }

  drop(event: CdkDragDrop<Task[] | null>): void {
    const previousContainer = event.previousContainer as CdkDropList<Task[]>;
    const container = event.container as CdkDropList<Task[]>;
    if (previousContainer === container) {
      return;
    }
    const item = previousContainer.data[event.previousIndex];
    this.afs.firestore.runTransaction(() => {
      const promise = Promise.all([
        this.afs.collection(previousContainer.id).doc(item.id).delete(),
        this.afs.collection(container.id).add(item),
      ]);
      return promise;
    });
    transferArrayItem(
      previousContainer.data,
      container.data,
      event.previousIndex,
      event.currentIndex
    );
  }
}
