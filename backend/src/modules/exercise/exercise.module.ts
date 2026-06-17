import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ExerciseCategory } from '../../database/entities/exercise-category.entity'
import { ExerciseLesson } from '../../database/entities/exercise-lesson.entity'
import { ExercisePaper } from '../../database/entities/exercise-paper.entity'
import { ExerciseDrawRecord } from '../../database/entities/exercise-draw-record.entity'
import { ExerciseService } from './exercise.service'
import { ThumbnailService } from './services/thumbnail.service'
import { ExercisePublicController, ExerciseAdminController } from './exercise.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ExerciseCategory, ExerciseLesson, ExercisePaper, ExerciseDrawRecord])],
  controllers: [ExercisePublicController, ExerciseAdminController],
  providers: [ExerciseService, ThumbnailService],
  exports: [ThumbnailService],
})
export class ExerciseModule {}
