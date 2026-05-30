import java.awt.event.*;
import java.awt.*;
import java.math.*;


public class Run {

    /**This runs Newton's method to compute a
high precision version of our near flat torus,
then computes various quantities associated to it*/
    
    public static void main(String[] args) {


	int PRECISION = 200;
	
	BigDecimal epsilon=BigDecimal.ONE.scaleByPowerOfTen(-50);
	VectorBig[] VB=NewtonsMethodBig.doNewtonBig(15,epsilon,PRECISION);

	BigDecimal ONE=new BigDecimal("1");
	BigDecimal shift=ONE.subtract(VB[0].x[2]);
	for(int i=0;i<8;++i) {
	    VB[i].x[2]=VB[i].x[2].add(shift);
	}
	System.out.println("first 4 torus vectors");
	for(int i=0;i<4;++i) VB[i].print();


	 System.out.println("");
	 System.out.println("----- cone angles deficits ---");
	 System.out.println("");

	 BigDecimal[] CONE = NewtonsMethodBig.turn3Big(VB,PRECISION);
	 for(int i=0;i<3;++i) System.out.println(CONE[i].toString());

	 System.out.println("");
	 System.out.println("-----  the matrix ----");
	 System.out.println("");

        epsilon=BigDecimal.ONE.scaleByPowerOfTen(-50);
        MatrixBig JAC=NewtonsMethodBig.turnDiffSymmBig(VB,epsilon,PRECISION);
	JAC.print();

	 System.out.println("");
	 System.out.println("-----  the inverse matrix ----");
	 System.out.println("");
	 
	JAC.PRECISION=PRECISION;
	 MatrixBig JACI=MatrixBig.inverse(JAC);
	JACI.PRECISION=PRECISION;
	JACI.print();
	
	 System.out.println("");
	 System.out.println("----- integer vectors scaled by 10^(32) then floored ----");
	 System.out.println("");

	 BigDecimal mega=BigDecimal.ONE.scaleByPowerOfTen(32);
	 MathContext mc=new MathContext(32);
         for (int i = 0; i < 8; i++) {
	     for(int j=0;j<3;++j) {
		 BigDecimal x=VB[i].x[j].multiply(mega,mc);
	         System.out.print(x.toString()+" ");
	     }
	     System.out.println("");
         }

	
    }

    
}
