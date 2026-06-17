import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherExerciseUpload } from '../../database/entities/teacher-exercise-upload.entity';
import { ExercisePaper } from '../../database/entities/exercise-paper.entity';
import { ExerciseCategory } from '../../database/entities/exercise-category.entity';
import { ExerciseLesson } from '../../database/entities/exercise-lesson.entity';
import { ExerciseContributionController } from './exercise-contribution.controller';
import { ExerciseContributionService } from './services/exercise-contribution.service';
import { PrintModule } from '../print/print.module';
import { BalanceModule } from '../balance/balance.module';
import { ThumbnailService } from '../exercise/services/thumbnail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherExerciseUpload, ExercisePaper, ExerciseCategory, ExerciseLesson]),
    PrintModule,
    BalanceModule,
  ],
  controllers: [ExerciseContributionController],
  providers: [ExerciseContributionService, ThumbnailService],
})
export class ExerciseContributionModule {}
