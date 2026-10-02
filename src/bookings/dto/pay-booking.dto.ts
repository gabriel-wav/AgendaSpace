import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum PaymentMethodEnum {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
}

export class PayBookingDto {
  @IsEnum(PaymentMethodEnum, { message: 'Método de pagamento inválido' })
  @IsNotEmpty({ message: 'O método de pagamento é obrigatório' })
  method: PaymentMethodEnum;

  @IsString()
  @IsNotEmpty({ message: 'Chave de idempotência é obrigatória' })
  idempotencyKey: string;

  @IsString()
  @IsNotEmpty({ message: 'Texto de aceite do contrato é obrigatório' })
  contractAcceptedText: string;

  @IsString()
  @IsNotEmpty({ message: 'Versão do contrato é obrigatória' })
  contractVersion: string;
}
