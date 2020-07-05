import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'fit-core',
  templateUrl: 'core.component.html',
  styleUrls: ['core.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoreComponent {

  constructor() {}

}
