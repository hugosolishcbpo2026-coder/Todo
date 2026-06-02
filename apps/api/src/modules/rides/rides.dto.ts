import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsLatitude, IsLongitude, ValidateNested } from "class-validator";
import { RidePaymentMethod } from "@todo/shared";

class GeoPointDto {
  @ApiProperty({ example: 22.8905 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: -109.9167 })
  @IsLongitude()
  lng!: number;
}

export class RideRequestDto {
  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  pickup!: GeoPointDto;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  dropoff!: GeoPointDto;

  @ApiProperty({ enum: ["cash", "card"], example: "cash" })
  @IsIn(["cash", "card"])
  paymentMethod!: RidePaymentMethod;
}
