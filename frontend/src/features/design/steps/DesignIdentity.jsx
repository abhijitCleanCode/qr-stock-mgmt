import CustomFormField from "@/components/shared/form/CustomFormField";
import { FormFieldType } from "@/config/FormFieldType";

const DesignIdentity = ({ control }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      <CustomFormField
        control={control}
        name="itemName"
        label="Item Name"
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
        name="name"
        label="Pattern"
        fieldType={FormFieldType.INPUT}
      />
      <CustomFormField
        control={control}
        name="quality"
        label="Quality"
        fieldType={FormFieldType.INPUT}
      />
      <CustomFormField
        control={control}
        name="defaultSellingPricePerPiece"
        label="Selling price / piece"
        fieldType={FormFieldType.INPUT}
      />
      <div className="md:col-span-2">
        <CustomFormField
          control={control}
          name="notes"
          label="Notes"
          fieldType={FormFieldType.TEXTAREA}
        />
      </div>
    </div>
  );
};

export default DesignIdentity;
