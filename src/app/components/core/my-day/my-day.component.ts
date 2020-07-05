import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'fit-my-day',
  templateUrl: 'my-day.component.html',
  styleUrls: ['my-day.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyDayComponent {

  constructor() {}

}
