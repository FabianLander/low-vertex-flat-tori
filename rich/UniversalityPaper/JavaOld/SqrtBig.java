import java.awt.*;
import java.math.*;

/**This file gives a high precision routine for the square root routine*/

public class SqrtBig {

 public static BigDecimal sqrt(BigDecimal x, int PRECISION) {
     if(x.compareTo(new BigDecimal("0"))==0) return x;
    BigDecimal TWO = new BigDecimal("2");
    BigDecimal guess = x.divide(TWO, PRECISION, RoundingMode.HALF_UP);
    BigDecimal EPSILON = BigDecimal.ONE.movePointLeft(PRECISION);

    while (true) {
        BigDecimal next = guess.add(x.divide(guess, PRECISION,
	RoundingMode.HALF_UP)).divide(TWO, PRECISION, RoundingMode.HALF_UP);
        if (next.subtract(guess).abs().compareTo(EPSILON) < 0) {
            break;
        }
        guess = next;
    }
    return guess;
 }


}
