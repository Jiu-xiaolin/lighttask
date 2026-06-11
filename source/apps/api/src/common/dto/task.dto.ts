import { IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";

const taskStatuses = ["TODO", "DOING", "DONE", "BLOCKED", "ARCHIVED", "DELETED"];
const priorities = ["low", "medium", "high"];

export class CreateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsIn(taskStatuses)
  status?: string;

  @IsOptional()
  @IsIn(priorities)
  priority?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  baselineStart?: string;

  @IsOptional()
  @IsString()
  baselineEnd?: string;

  @IsOptional()
  @IsString()
  currentStart?: string;

  @IsOptional()
  @IsString()
  currentEnd?: string;

  @IsOptional()
  @IsArray()
  dependencyIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsArray()
  assignments?: any[];
}

export class UpdateTaskDto extends CreateTaskDto {}
