import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username must contain only letters, numbers, or underscores' })
  username: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;

  @IsString()
  @Length(1, 50)
  displayName: string;

  @IsString()
  @Length(8, 64)
  password: string;

  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  otp: string;
}
