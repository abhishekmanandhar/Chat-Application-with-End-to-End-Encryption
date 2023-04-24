const isPrime = num => {
    for(let i = 2, s = Math.sqrt(num); i <= s; i++)
        if(num % i === 0) return false;
    return num > 1;
};

exports.gGenerator = function (num) {
    for (let i = 2; i < num ; i++){
        if(true){
            let aVal = i;
            let mul = 1;
            let values = new Set();
            let needContinue = false;
            for (let x = 1; x < num; ++x) {
                mul = (mul * aVal) % num;
                if (values.has(mul)) {
                    needContinue = true;
                    break;
                }
                values.add(mul);
            }
            if (!needContinue) {
                return aVal;
            }
        }
    }
};

exports.randomPrime = function () {
    let n = Math.floor(Math.random() * (10000 - 2)) + 2;
    while(true){
        if(isPrime(n)){
            return n;
        } else {
            n++;
        }
    }
};
