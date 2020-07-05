import { Injectable } from '@angular/core';
import {HttpBackend, HttpClient} from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable()
export class ConfigService {

  settings: any;

  constructor(private http: HttpClient, private handler: HttpBackend) {
    this.http = new HttpClient(handler);
  }

  load() {
    const jsonFile = `/assets/config/config.${environment.name}.json`;

    return new Promise<void>((resolve, reject) => {
      this.http.get(jsonFile).toPromise().then(response => {
        this.settings = response;
        resolve();
      }).catch((response => reject(`Could not load file '${jsonFile}': ${JSON.stringify(response)}`)));
    });
  }

  get(key: string): string {
    return this.settings[key];
  }

}
