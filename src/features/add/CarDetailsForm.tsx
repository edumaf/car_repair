// Optional details when adding a car: asking price, mileage (in the region's unit), seller type.
import { View } from 'react-native';

import { currencySymbol, defaultMileageUnit } from '@/core/region';
import type { MileageUnit, SellerType } from '@/core/types';
import { AppText } from '@/design/components/AppText';
import { ChoiceChips } from '@/design/components/ChoiceChips';
import { TextField, parseNumber } from '@/design/components/TextField';
import { space } from '@/design/tokens';
import { useRegion } from '@/hooks/useRegion';

export interface CarDetails {
  price: string;
  mileage: string;
  seller: SellerType;
}

export const EMPTY_DETAILS: CarDetails = { price: '', mileage: '', seller: 'unknown' };

const SELLER_CHOICES = [
  { value: 'private', label: 'Private seller' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'unknown', label: 'Not sure' },
] as const;

export function useDetailsValues(d: CarDetails): {
  askingPrice: number | null;
  mileage: number | null;
  sellerType: SellerType;
  mileageUnit: MileageUnit;
} {
  const region = useRegion();
  return {
    askingPrice: parseNumber(d.price),
    mileage: parseNumber(d.mileage),
    sellerType: d.seller,
    mileageUnit: defaultMileageUnit(region),
  };
}

export function CarDetailsForm({ value, onChange }: { value: CarDetails; onChange: (d: CarDetails) => void }) {
  const region = useRegion();
  const unit = defaultMileageUnit(region);
  return (
    <View style={{ gap: space.lg }}>
      <AppText variant="heading">Optional details</AppText>
      <TextField
        label="Asking price"
        prefix={currencySymbol(region) || undefined}
        keyboardType="number-pad"
        value={value.price}
        onChangeText={(price) => onChange({ ...value, price })}
        placeholder={region === 'us' ? '15,900' : 'e.g. 8500'}
      />
      <TextField
        label="Mileage"
        suffix={unit}
        keyboardType="number-pad"
        value={value.mileage}
        onChangeText={(mileage) => onChange({ ...value, mileage })}
        placeholder={unit === 'mi' ? '62,000' : '120000'}
      />
      <ChoiceChips
        label="Who’s selling?"
        choices={SELLER_CHOICES}
        value={value.seller}
        onChange={(seller) => onChange({ ...value, seller })}
      />
    </View>
  );
}
