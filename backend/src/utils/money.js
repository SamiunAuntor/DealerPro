function roundMoney(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function allocateAmountProportionally(baseItems, totalAmount) {
    const roundedTotalAmount = roundMoney(totalAmount);
    const totalBase = baseItems.reduce((sum, item) => sum + roundMoney(item.baseAmount), 0);

    if (roundedTotalAmount <= 0 || totalBase <= 0) {
        return baseItems.map(() => 0);
    }

    let allocatedSoFar = 0;

    return baseItems.map((item, index) => {
        if (index === baseItems.length - 1) {
            return roundMoney(roundedTotalAmount - allocatedSoFar);
        }

        const share = roundMoney((roundMoney(item.baseAmount) / totalBase) * roundedTotalAmount);
        allocatedSoFar = roundMoney(allocatedSoFar + share);
        return share;
    });
}

module.exports = {
    roundMoney,
    allocateAmountProportionally,
};
