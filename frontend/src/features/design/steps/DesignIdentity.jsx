import { useEffect, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "react-toastify";

import CustomFormField from "@/components/shared/form/CustomFormField";
import { FormFieldType } from "@/config/FormFieldType";
import JobberSearchInput from "../components/JobberSearchInput";
import QualitySearchInput from "../components/QualitySearchInput";
import PatternSearchInput from "../components/PatternSearchInput";
import { useExistingDesignByCode } from "../hooks/useExistingDesignByCode";

const CODE_CHECK_DEBOUNCE_MS = 400;

const DesignIdentity = ({ control, setExistingDesignByCode }) => {
  const codeValue = useWatch({ control, name: "code" });
  const [debouncedCode, setDebouncedCode] = useState("");
  const lastWarnedCode = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedCode(codeValue ?? ""), CODE_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [codeValue]);

  const { data: existingDesign } = useExistingDesignByCode(debouncedCode);

  useEffect(() => {
    setExistingDesignByCode?.(existingDesign ?? null);

    if (existingDesign && lastWarnedCode.current !== existingDesign.code) {
      toast.warn(`Design code "${existingDesign.code}" already exists. Wanna continue?`);
      lastWarnedCode.current = existingDesign.code;
    }
  }, [existingDesign, setExistingDesignByCode]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      <CustomFormField
        control={control}
        name="itemName"
        label="Item Name"
        fieldType={FormFieldType.INPUT}
      />
      <div>
        <CustomFormField
          control={control}
          name="code"
          label="Design Code"
          fieldType={FormFieldType.INPUT}
        />
        {existingDesign && (
          <p className="mt-1 text-sm text-amber-600">
            Design code exists, wanna continue?
          </p>
        )}
      </div>
      <JobberSearchInput />
      <PatternSearchInput />
      <QualitySearchInput />
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
