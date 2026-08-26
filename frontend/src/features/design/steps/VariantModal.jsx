import { useState } from "react";
import ActionModal from "@/components/shared/ActionModal";

const VariantModal = ({ onClose }) => {
    const [open, setOpen] = useState(true);

    const handleOpenChange = (nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
            setTimeout(onClose, 150);
        }
    };

    return (
        <ActionModal
            openActionModal={open}
            setOpenActionModal={handleOpenChange}
            title="Add Variant"
            subtitle="Create a new variant for this design"
        >
            <div className="p-4 sm:p-6" />
        </ActionModal>
    );
};

export default VariantModal;
