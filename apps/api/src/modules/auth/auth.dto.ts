import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Matches, Length } from "class-validator";
import { UserRole } from "@todo/shared";

const E164 = /^\+?[1-9]\d{6,14}$/;

export class RequestOtpDto {
  @ApiProperty({ example: "+5216241234567", description: "Phone in E.164 format" })
  @IsString()
  @Matches(E164, { message: "phone must be a valid E.164 number" })
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: "+5216241234567" })
  @IsString()
  @Matches(E164, { message: "phone must be a valid E.164 number" })
  phone!: string;

  @ApiProperty({ example: "000000", description: "6-digit OTP code" })
  @IsString()
  @Length(4, 8)
  code!: string;

  @ApiProperty({ enum: ["rider", "driver", "admin", "support"] })
  @IsIn(["rider", "driver", "admin", "support"])
  role!: UserRole;

  @ApiProperty({ required: false, example: "Hugo" })
  @IsOptional()
  @IsString()
  name?: string;
}
