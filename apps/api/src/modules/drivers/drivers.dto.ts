import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class VehicleDto {
  @ApiProperty({ example: "ABC-123-D" })
  @IsString()
  plate!: string;

  @ApiProperty({ required: false, example: "Nissan Versa" })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false, example: "white" })
  @IsOptional()
  @IsString()
  color?: string;
}

export class OnboardingDto {
  @ApiProperty({ required: false, type: VehicleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleDto)
  vehicle?: VehicleDto;
}

export class SetOnlineDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  online!: boolean;
}

export class UpdateLocationDto {
  @ApiProperty({ example: 22.8905 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: -109.9167 })
  @IsLongitude()
  lng!: number;

  @ApiProperty({ required: false, example: 180 })
  @IsOptional()
  headingDeg?: number;
}
