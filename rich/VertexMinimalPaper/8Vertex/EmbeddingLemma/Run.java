import java.awt.event.*;
import java.awt.*;
import java.math.*;


public class Run {

    public static void main(String[] args) {

        BigInteger min = BigInteger.TEN.pow(100);
        BigInteger target = BigInteger.TEN.pow(35);

	for(int j=0;j<24;++j) {
	     VectorBig  v=Separation.mainTest(0,j);
	     System.out.println(j+"   "); v.print();
	}

	for(int j=0;j<72;++j) {
	   VectorBig  v=Separation.mainTest(1,j);
	   System.out.println(j+"   "); v.print();
	}
    }
}
