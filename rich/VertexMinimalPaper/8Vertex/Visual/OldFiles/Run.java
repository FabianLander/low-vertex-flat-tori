import java.awt.event.*;
import java.awt.*;
import java.math.*;


public class Run {

    
    public static void main(String[] args) {
	  BigDecimal x=new BigDecimal(".25");
	  BigDecimal y=new BigDecimal("1");
	  TorusBig T=GoodPath.diamond(x,y,100);
	  BigDecimal d=TriangleCheckerBig.embeddedRobust(T);
	  System.out.println(d.toString());

	  //TriangleCheckerBig.listVolumes(T);

	  Torus TT=PaperTorus.shape();
	  TriangleChecker.listVolumes(TT);


    }
    
    
    
}
