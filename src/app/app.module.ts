import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { StorageModule } from './crypto/storage.module';



@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    StorageModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
