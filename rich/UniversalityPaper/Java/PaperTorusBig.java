import java.awt.event.*;
import java.awt.*;
import java.math.*;

public class PaperTorusBig {


public static TorusBig diamondBig(BigDecimal x, BigDecimal y, int precision) {
    MathContext mc = new MathContext(precision, RoundingMode.HALF_EVEN);

    BigDecimal ZERO  = BigDecimal.ZERO;
    BigDecimal TWO   = new BigDecimal("2");
    BigDecimal THREE = new BigDecimal("3");
    BigDecimal EIGHT = new BigDecimal("8");

    BigDecimal x2 = x.multiply(x, mc);
    BigDecimal y2 = y.multiply(y, mc);

    BigDecimal eightTimesX = EIGHT.multiply(x, mc);
    BigDecimal S0 = SqrtBig.sqrt(eightTimesX, precision);
    BigDecimal S  = S0.multiply(y, mc);
    
    TorusBig T = new TorusBig();

    T.U[0] = new VectorBig(x2.negate(mc).add(TWO.multiply(x, mc), mc).subtract(y2, mc),
                           ZERO, ZERO, precision);

    T.U[1] = new VectorBig(x2.multiply(TWO, mc).negate(mc).add(x, mc),
                           y.subtract(TWO.multiply(x, mc).multiply(y, mc), mc),
                           S, precision);

    T.U[2] = new VectorBig(x2.negate(mc).add(x, mc).subtract(y2, mc),
                           y.negate(mc), ZERO, precision);

    T.U[3] = new VectorBig(x2.negate(mc).add(THREE.multiply(x, mc), mc).subtract(y2, mc),
                           y, ZERO, precision);

    for (int k = 0; k < 4; ++k) {
        T.U[7 - k] = T.U[k].rotateZ();
    }

    return T;
}


    /**This is at the modular parameter 1/4 + i.  The values 1/4,1,-1/10 work for embeddedness*/


public static TorusBig special1Big(BigDecimal s, BigDecimal c0, BigDecimal c1, BigDecimal c2, int digits) {
    MathContext mc = new MathContext(digits);

    BigDecimal ONE   = BigDecimal.ONE;
    BigDecimal ZERO  = BigDecimal.ZERO;
    BigDecimal SQRT2 = SqrtBig.sqrt(new BigDecimal("2"), digits);

    BigDecimal ss = s.multiply(s, mc);

    BigDecimal[][] d = {
        {
            new BigDecimal("-9").divide(new BigDecimal("16"), mc)
                .add(c0.multiply(ss, mc).multiply(new BigDecimal("16"), mc).divide(new BigDecimal("16"), mc), mc),
            c1.multiply(ss, mc),
            c2.multiply(ss, mc)
        },
        {
            new BigDecimal("1").divide(new BigDecimal("8"), mc)
                .add(s, mc),
            (new BigDecimal("827356")
                .subtract(new BigDecimal("575552").multiply(s, mc), mc)
                .subtract(new BigDecimal("640000").multiply(ss, mc), mc)
                .add(new BigDecimal("188324").multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("47081").multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("94162").multiply(SQRT2, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("1654712"), mc),
            (new BigDecimal("575552").multiply(SQRT2, mc)
                .add(new BigDecimal("91136").multiply(SQRT2, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("763876").multiply(SQRT2, mc).multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("190969").multiply(SQRT2, mc).multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("763876").multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("575552"), mc)
        },
        {
            (new BigDecimal("-467636")
                .add(new BigDecimal("195584").multiply(ss, mc), mc)
                .add(new BigDecimal("404156").multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("101039").multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("202078").multiply(SQRT2, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("575552"), mc),
            (new BigDecimal("-17986")
                .subtract(new BigDecimal("9216").multiply(ss, mc), mc)
                .subtract(new BigDecimal("19044").multiply(c0, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("4761").multiply(c1, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("9522").multiply(SQRT2, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("17986"), mc),
            (new BigDecimal("281")
                .multiply(new BigDecimal("1024").multiply(SQRT2, mc)
                    .add(new BigDecimal("2116").multiply(SQRT2, mc).multiply(c0, mc), mc)
                    .subtract(new BigDecimal("529").multiply(SQRT2, mc).multiply(c1, mc), mc)
                    .add(new BigDecimal("2116").multiply(c2, mc), mc), mc)
                .multiply(ss, mc))
                .divide(new BigDecimal("575552"), mc)
        },
        { new BigDecimal("-5").divide(new BigDecimal("16"), mc), ONE, ZERO },
        { new BigDecimal("5").divide(new BigDecimal("16"), mc),  new BigDecimal("-1"), ZERO },
        {
            (new BigDecimal("467636")
                .subtract(new BigDecimal("195584").multiply(ss, mc), mc)
                .subtract(new BigDecimal("404156").multiply(c0, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("101039").multiply(c1, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("202078").multiply(SQRT2, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("575552"), mc),
            (new BigDecimal("17986")
                .add(new BigDecimal("9216").multiply(ss, mc), mc)
                .add(new BigDecimal("19044").multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("4761").multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("9522").multiply(SQRT2, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("17986"), mc),
            (new BigDecimal("281")
                .multiply(new BigDecimal("1024").multiply(SQRT2, mc)
                    .add(new BigDecimal("2116").multiply(SQRT2, mc).multiply(c0, mc), mc)
                    .subtract(new BigDecimal("529").multiply(SQRT2, mc).multiply(c1, mc), mc)
                    .add(new BigDecimal("2116").multiply(c2, mc), mc), mc)
                .multiply(ss, mc))
                .divide(new BigDecimal("575552"), mc)
        },
        {
            new BigDecimal("-1").divide(new BigDecimal("8"), mc)
                .subtract(s, mc),
            (new BigDecimal("-827356")
                .add(new BigDecimal("575552").multiply(s, mc), mc)
                .add(new BigDecimal("640000").multiply(ss, mc), mc)
                .subtract(new BigDecimal("188324").multiply(c0, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("47081").multiply(c1, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("94162").multiply(SQRT2, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("1654712"), mc),
            (new BigDecimal("575552").multiply(SQRT2, mc)
                .add(new BigDecimal("91136").multiply(SQRT2, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("763876").multiply(SQRT2, mc).multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("190969").multiply(SQRT2, mc).multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("763876").multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("575552"), mc)
        },
        {
            new BigDecimal("9").divide(new BigDecimal("16"), mc)
                .subtract(c0.multiply(ss, mc).multiply(new BigDecimal("16"), mc).divide(new BigDecimal("16"), mc), mc),
            c1.multiply(ss, mc).negate(),
            c2.multiply(ss, mc)
        }
    };

    TorusBig T = new TorusBig();
    for (int i = 0; i < 8; ++i) {
        T.U[i] = new VectorBig(d[i][0], d[i][1], d[i][2], digits);
    }
    return T;
}


    public static TorusBig special2Big(BigDecimal s, BigDecimal c0, BigDecimal c1, BigDecimal c2, int digits) {
    MathContext mc = new MathContext(digits);

    BigDecimal ONE   = BigDecimal.ONE;
    BigDecimal ZERO  = BigDecimal.ZERO;
    BigDecimal SQRT6 = SqrtBig.sqrt(new BigDecimal("6"), digits);

    BigDecimal ss = s.multiply(s, mc);

    BigDecimal[][] d = {
        {
            (new BigDecimal("-61").add(new BigDecimal("36").multiply(c0, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("36"), mc),
            c1.multiply(ss, mc),
            c2.multiply(ss, mc)
        },
        {
            (ONE.divide(new BigDecimal("9"), mc)).add(s, mc),
            (new BigDecimal("788180265")
                .subtract(new BigDecimal("561871080").multiply(s, mc), mc)
                .subtract(new BigDecimal("445704768").multiply(ss, mc), mc)
                .add(new BigDecimal("423147681").multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("94032818").multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("94032818").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("1576360530"), mc),
            (new BigDecimal("374580720").multiply(SQRT6, mc)
                .add(new BigDecimal("107518752").multiply(SQRT6, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("704083221").multiply(SQRT6, mc).multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("156462938").multiply(SQRT6, mc).multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("938777628").multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("374580720"), mc)
        },
        {
            (new BigDecimal("-569674845")
                .subtract(new BigDecimal("15419808").multiply(ss, mc), mc)
                .subtract(new BigDecimal("60685749").multiply(c0, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("13485722").multiply(c1, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("13485722").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("280935540"), mc),
            (new BigDecimal("-7803765")
                .subtract(new BigDecimal("2846016").multiply(ss, mc), mc)
                .subtract(new BigDecimal("11200698").multiply(c0, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("2489044").multiply(c1, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("2489044").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("5202510"), mc),
            (new BigDecimal("5317")
                .multiply(new BigDecimal("23328").multiply(SQRT6, mc)
                    .add(new BigDecimal("91809").multiply(SQRT6, mc).multiply(c0, mc), mc)
                    .subtract(new BigDecimal("20402").multiply(SQRT6, mc).multiply(c1, mc), mc)
                    .add(new BigDecimal("122412").multiply(c2, mc), mc), mc)
                .multiply(ss, mc))
                .divide(new BigDecimal("374580720"), mc)
        },
        { new BigDecimal("-49").divide(new BigDecimal("36"), mc), new BigDecimal("3").divide(new BigDecimal("2"), mc), ZERO },
        { new BigDecimal("49").divide(new BigDecimal("36"), mc), new BigDecimal("-3").divide(new BigDecimal("2"), mc), ZERO },
        {
            (new BigDecimal("569674845")
                .add(new BigDecimal("15419808").multiply(ss, mc), mc)
                .add(new BigDecimal("60685749").multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("13485722").multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("13485722").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("280935540"), mc),
            (new BigDecimal("7803765")
                .add(new BigDecimal("2846016").multiply(ss, mc), mc)
                .add(new BigDecimal("11200698").multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("2489044").multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("2489044").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("5202510"), mc),
            (new BigDecimal("5317")
                .multiply(new BigDecimal("23328").multiply(SQRT6, mc)
                    .add(new BigDecimal("91809").multiply(SQRT6, mc).multiply(c0, mc), mc)
                    .subtract(new BigDecimal("20402").multiply(SQRT6, mc).multiply(c1, mc), mc)
                    .add(new BigDecimal("122412").multiply(c2, mc), mc), mc)
                .multiply(ss, mc))
                .divide(new BigDecimal("374580720"), mc)
        },
        {
            (new BigDecimal("-1").divide(new BigDecimal("9"), mc))
                .subtract(s, mc),
            (new BigDecimal("-788180265")
                .add(new BigDecimal("561871080").multiply(s, mc), mc)
                .add(new BigDecimal("445704768").multiply(ss, mc), mc)
                .subtract(new BigDecimal("423147681").multiply(c0, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("94032818").multiply(c1, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("94032818").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("1576360530"), mc),
            (new BigDecimal("374580720").multiply(SQRT6, mc)
                .add(new BigDecimal("107518752").multiply(SQRT6, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("704083221").multiply(SQRT6, mc).multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("156462938").multiply(SQRT6, mc).multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("938777628").multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("374580720"), mc)
        },
        {
            (new BigDecimal("61").subtract(new BigDecimal("36").multiply(c0, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("36"), mc),
            c1.multiply(ss, mc).negate(),
            c2.multiply(ss, mc)
        }
    };

    TorusBig T = new TorusBig();
    for (int i = 0; i < 8; ++i) {
        T.U[i] = new VectorBig(d[i][0], d[i][1], d[i][2], digits);
    }
    return T;
}

 public static TorusBig special3Big(BigDecimal s, BigDecimal c0, BigDecimal c1, BigDecimal c2, int digits) {
    MathContext mc = new MathContext(digits);


    BigDecimal ONE   = BigDecimal.ONE;
    BigDecimal ZERO  = BigDecimal.ZERO;
    BigDecimal SQRT6 = SqrtBig.sqrt(new BigDecimal("6"), digits);


    BigDecimal ss = s.multiply(s, mc);


    BigDecimal[][] d = {
        {
            (new BigDecimal("-436").add(new BigDecimal("9").multiply(c0, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("9"), mc),
            c1.multiply(ss, mc),
            c2.multiply(ss, mc)
        },
        {
            (ONE.divide(new BigDecimal("9"), mc)).add(s, mc),
            (new BigDecimal("102933360894")
                .subtract(new BigDecimal("4154261202").multiply(s, mc), mc)
                .subtract(new BigDecimal("168427917").multiply(ss, mc), mc)
                .add(new BigDecimal("100606640442").multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("4790792402").multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("4790792402").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("44114297526"), mc),
            (new BigDecimal("2769507468").multiply(SQRT6, mc)
                .add(new BigDecimal("81935469").multiply(SQRT6, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("102683771043").multiply(SQRT6, mc).multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("4889703383").multiply(SQRT6, mc).multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("29338220298").multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("593465886"), mc)
        },
        {
            (new BigDecimal("-202635629742")
                .subtract(new BigDecimal("158293359").multiply(ss, mc), mc)
                .subtract(new BigDecimal("194364702462").multiply(c0, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("9255462022").multiply(c1, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("9255462022").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("4154261202"), mc),
            (new BigDecimal("-230792289")
                .subtract(new BigDecimal("370818").multiply(ss, mc), mc)
                .subtract(new BigDecimal("455318724").multiply(c0, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("21681844").multiply(c1, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("21681844").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("32970327"), mc),
            (new BigDecimal("95729")
                .multiply(new BigDecimal("1701").multiply(SQRT6, mc)
                    .add(new BigDecimal("2088618").multiply(SQRT6, mc).multiply(c0, mc), mc)
                    .subtract(new BigDecimal("99458").multiply(SQRT6, mc).multiply(c1, mc), mc)
                    .add(new BigDecimal("596748").multiply(c2, mc), mc), mc)
                .multiply(ss, mc))
                .divide(new BigDecimal("1186931772"), mc)
        },
        { new BigDecimal("-433").divide(new BigDecimal("9"), mc), new BigDecimal("7"), ZERO },
        { new BigDecimal("433").divide(new BigDecimal("9"), mc), new BigDecimal("-7"), ZERO },
        {
            (new BigDecimal("202635629742")
                .add(new BigDecimal("158293359").multiply(ss, mc), mc)
                .add(new BigDecimal("194364702462").multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("9255462022").multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("9255462022").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("4154261202"), mc),
            (new BigDecimal("230792289")
                .add(new BigDecimal("370818").multiply(ss, mc), mc)
                .add(new BigDecimal("455318724").multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("21681844").multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("21681844").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("32970327"), mc),
            (new BigDecimal("95729")
                .multiply(new BigDecimal("1701").multiply(SQRT6, mc)
                    .add(new BigDecimal("2088618").multiply(SQRT6, mc).multiply(c0, mc), mc)
                    .subtract(new BigDecimal("99458").multiply(SQRT6, mc).multiply(c1, mc), mc)
                    .add(new BigDecimal("596748").multiply(c2, mc), mc), mc)
                .multiply(ss, mc))
                .divide(new BigDecimal("1186931772"), mc)
        },
        {
            (new BigDecimal("-1").divide(new BigDecimal("9"), mc))
                .subtract(s, mc),
            (new BigDecimal("-102933360894")
                .add(new BigDecimal("4154261202").multiply(s, mc), mc)
                .add(new BigDecimal("168427917").multiply(ss, mc), mc)
                .subtract(new BigDecimal("100606640442").multiply(c0, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("4790792402").multiply(c1, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("4790792402").multiply(SQRT6, mc).multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("44114297526"), mc),
            (new BigDecimal("2769507468").multiply(SQRT6, mc)
                .add(new BigDecimal("81935469").multiply(SQRT6, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("102683771043").multiply(SQRT6, mc).multiply(c0, mc).multiply(ss, mc), mc)
                .subtract(new BigDecimal("4889703383").multiply(SQRT6, mc).multiply(c1, mc).multiply(ss, mc), mc)
                .add(new BigDecimal("29338220298").multiply(c2, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("593465886"), mc)
        },
        {
            (new BigDecimal("436").subtract(new BigDecimal("9").multiply(c0, mc).multiply(ss, mc), mc))
                .divide(new BigDecimal("9"), mc),
            c1.multiply(ss, mc).negate(),
            c2.multiply(ss, mc)
        }
    };


    TorusBig T = new TorusBig();
    for (int i = 0; i < 8; ++i) {
        T.U[i] = new VectorBig(d[i][0], d[i][1], d[i][2], digits);
    }
    return T;
}



public static TorusBig special4Big(BigDecimal s, BigDecimal c1, BigDecimal c2, BigDecimal c3, int digits) {
    MathContext mc = new MathContext(digits);

    BigDecimal ONE   = BigDecimal.ONE;
    BigDecimal ZERO  = BigDecimal.ZERO;
    BigDecimal SQRT2 = SqrtBig.sqrt(new BigDecimal("2"), digits);

    BigDecimal ss = s.multiply(s, mc);

    // Reused denominators and small integers
    BigDecimal DEN1 = new BigDecimal("8398404");
    BigDecimal DEN2 = new BigDecimal("91287");
    BigDecimal TWO  = new BigDecimal("2");
    BigDecimal EIGHT = new BigDecimal("8");
    BigDecimal TWENTYTHREE = new BigDecimal("23");

    // Common √2 * (linear form in c's) * s^2 / denom terms
    BigDecimal T1 = (SQRT2
        .multiply(new BigDecimal("-2419200")
            .add(new BigDecimal("2099601").multiply(c1, mc), mc)
            .add(new BigDecimal("-1904400").multiply(c2, mc), mc)
            .add(new BigDecimal("-8794625").multiply(c3, mc), mc), mc)
        .multiply(ss, mc))
        .divide(DEN1, mc);

    BigDecimal T2bump = (SQRT2
        .multiply(new BigDecimal("-48384")
            .add(new BigDecimal("-129375").multiply(c2, mc), mc)
            .add(new BigDecimal("-201250").multiply(c3, mc), mc), mc)
        .multiply(ss, mc))
        .divide(DEN2, mc);

    BigDecimal T3 = (SQRT2
        .multiply(new BigDecimal("3290112")
            .add(new BigDecimal("-12207204").multiply(c2, mc), mc)
            .add(new BigDecimal("-15489649").multiply(c3, mc), mc), mc)
        .multiply(ss, mc))
        .divide(DEN1, mc);

    BigDecimal[][] d = {
        {
            (new BigDecimal("-9").divide(new BigDecimal("16"), mc)),                  // -(9/16)
            c1.multiply(ss, mc),                                                      // c1 s^2
            T1                                                                        // √2 * (...) s^2 / 8398404
        },
        {
            (ONE.divide(new BigDecimal("8"), mc)).add(s, mc),                         // 1/8 + s
            (ONE.divide(TWO, mc)).subtract(EIGHT.multiply(s, mc).divide(TWENTYTHREE, mc), mc), // 1/2 - (8 s)/23
            SQRT2.add(T2bump, mc)                                                     // √2 + √2*(...)*s^2/91287
        },
        {
            (new BigDecimal("-13").divide(new BigDecimal("16"), mc)).add(c2.multiply(ss, mc), mc), // -(13/16) + c2 s^2
            (new BigDecimal("-1")).add(c3.multiply(ss, mc), mc),                         // -1 + c3 s^2
            T3
        },
        {
            (new BigDecimal("-5").divide(new BigDecimal("16"), mc)),                 // -(5/16)
            ONE,                                                                     // 1
            ZERO                                                                     // 0
        },
        {
            (new BigDecimal("5").divide(new BigDecimal("16"), mc)),                  // 5/16
            (new BigDecimal("-1")),                                                  // -1
            ZERO                                                                     // 0
        },
        {
            (new BigDecimal("13").divide(new BigDecimal("16"), mc)).subtract(c2.multiply(ss, mc), mc), // 13/16 - c2 s^2
            ONE.subtract(c3.multiply(ss, mc), mc),                                    // 1 - c3 s^2
            T3
        },
        {
            (new BigDecimal("-1").divide(new BigDecimal("8"), mc)).subtract(s, mc),  // -(1/8) - s
            (new BigDecimal("-1").divide(TWO, mc)).add(EIGHT.multiply(s, mc).divide(TWENTYTHREE, mc), mc), // -(1/2) + (8 s)/23
            SQRT2.add(T2bump, mc)
        },
        {
            (new BigDecimal("9").divide(new BigDecimal("16"), mc)),                  // 9/16
            c1.multiply(ss, mc).negate(),                                             // -c1 s^2
            T1
        }
    };

    TorusBig T = new TorusBig();
    for (int i = 0; i < 8; ++i) {
        T.U[i] = new VectorBig(d[i][0], d[i][1], d[i][2], digits);
    }
    return T;
}
    

    
}



