import { Module } from '@nestjs/common'
import { PlatformModule } from './platform/platform.module'
import { moduleImplementations } from './modules/index'

/**
 * The whole application. Adding a module changes exactly one file: the module
 * list in `./modules/index.ts`. Nothing here needs to know what modules exist.
 */
@Module({
  imports: [PlatformModule, ...moduleImplementations],
})
export class AppModule {}