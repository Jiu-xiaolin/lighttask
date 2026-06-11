import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const projectStatuses = ["ACTIVE", "ARCHIVED", "DELETED"];
const projectRisks = ["low", "medium", "high"];

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  group?: string;

  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  baselineEnd?: string;

  @IsOptional()
  @IsString()
  currentEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateProjectDto extends CreateProjectDto {
  @IsOptional()
  @IsIn(projectStatuses)
  status?: string;

  @IsOptional()
  @IsIn(projectRisks)
  risk?: string;
}

export class InviteProjectMemberDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  role?: string;
}

export class UpdateProjectMemberDto {
  @IsString()
  @MaxLength(40)
  role!: string;
}
