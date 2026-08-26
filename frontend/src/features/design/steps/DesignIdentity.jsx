import CustomFormField from "@/components/shared/form/CustomFormField";
import { FormFieldType } from "@/config/FormFieldType";

const DesignIdentity = ({ control }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      <CustomFormField
        control={control}
        name="name"
        label="Design Name"
        fieldType={FormFieldType.INPUT}
      />
      <CustomFormField
        control={control}
        name="code"
        label="Design Code"
        fieldType={FormFieldType.INPUT}
      />
      <CustomFormField
        control={control}
        name="defaultCostPricePerPiece"
        label="Cost price / piece"
        fieldType={FormFieldType.INPUT}
      />
      <CustomFormField
        control={control}
        name="defaultSellingPricePerPiece"
        label="Selling price / piece"
        fieldType={FormFieldType.INPUT}
      />
      <CustomFormField
        control={control}
        name="notes"
        label="Notes"
        fieldType={FormFieldType.TEXTAREA}
      />
    </div>
  );
};

export default DesignIdentity;
