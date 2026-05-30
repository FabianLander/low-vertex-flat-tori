import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;


public class BundleCanvas extends ScaleCanvas implements MouseListener, MouseMotionListener, KeyListener {
    Manager M;
    Complex[] Z=new Complex[100000];
    Complex[] TRI=new Complex[3];
    int COUNT;
    ListenSquare CONTROL;
    SelectInteger POINTSIZE;
    ControlPanelColor DISPLAY,DIVISOR;
    Point JX;
    boolean alive;

     public BundleCanvas() {
	 addMouseListener(this);
	 addMouseMotionListener(this);
	 addKeyListener(this);
	 CONTROL=new ListenSquare(0,0,0,0);
	 setScales(10,150,580);
	 TRI[0]=new Complex(0,0);
	 TRI[1]=new Complex(0,0);
	 TRI[2]=new Complex(0,0);
	 POINTSIZE=new SelectInteger(450,40,50,25,9,1,30,1);
	 setPanels();
     }
    


    
    public void setPanels() {

       Color[] C0={new Color(100,150,255),
                   Color.white,
                   Color.white,
                   Color.black,
                   Color.white};

       
       String[] DisplayString={"bg",
			       "axes",
			       "triangle",
 			       "magic point",
			       "experiment",
			       "display"};
       
       Color[] DisplayColor={new Color(100,120,140),//bg
			     new Color(200,200,200),//axes
			     new Color(100,200,255), //triangle
			     new Color(50,100,255),//magic point
			     new Color(200,0,0),//magic point
			     new Color(255,50,0)};
       
       int[] DisplayState={1,1,1,1,1};
       DISPLAY=new ControlPanelColor(C0,DisplayString,DisplayState,5,DisplayColor);


       
       String[] DivisorString={"123",
			       "4",
			       "5",
 			       "6",
			       "7",
			       "divisors"};
       
       Color[] DivisorColor={new Color(0,0,255),
			     new Color(255,250,0),
			     new Color(0,200,0),
			     new Color(255,180,0),
			     new Color(255,50,255)};
       
       int[] DivisorState={1,1,1,1,1};
       DIVISOR=new ControlPanelColor(C0,DivisorString,DivisorState,5,DivisorColor);


       
    }


    
   public void paint(Graphics g2) {
      Graphics2D g=(Graphics2D) g2;
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
      drawBG(g);
      drawAxes(g);
      drawControls(g);
      drawDivisors(g);
      drawTriangle(g);
      drawMagicPoint(g);
      drawTri(g);
      drawPoints(g);
      drawControls(g);
   }

    public double[] getCoords() {
	double x=.25;
	double y=1;
	try {
   	Complex z=M.X.SOURCE;
                x=z.x;
	    y=z.y;
	}
	catch(Exception e) {}
 	double[] xy={x,y};
	return xy;
    }

    public void drawBG(Graphics2D g) {
	g.setColor(DISPLAY.M[0].C);
        g.fillRect(0,0,getWidth(),getHeight());
    }

    
    public void drawAxes(Graphics2D g) {
	if(DISPLAY.L[1].on==0) return;
	Path2D.Double p=new Path2D.Double();
	p.moveTo(-100,0);
	p.lineTo(+100,0);
	p.moveTo(0,-100);
	p.lineTo(0,+100);
	p=transform(p);
	g.setColor(DISPLAY.M[1].C);
	g.draw(p);
    }


    

    public void drawTriangle(Graphics2D g) {
	if(DISPLAY.L[2].on==0) return;
	Path2D.Double p=new Path2D.Double();
	double[] xy=getCoords();
	double x=xy[0];
	double y=xy[1];
	Complex z12=point12(x,y);
	Complex z13=point13(x,y);
	Complex z23=point23(x,y);
	Complex[] zz={z12,z13,z23};
	p=toPath(zz);
	p=transform(p);
	g.setColor(DISPLAY.M[2].C);
	g.fill(p);
    }


    public void drawMagicPoint(Graphics2D g) {
	if(DISPLAY.L[3].on==0) return;
	double[] xy=getCoords();
	double x=xy[0];
	double y=xy[1];
	Complex z=magicPoint(x,y);
	for(int i=0;i<8;++i) {
	    double d=Math.pow(.5,i);
	    fillPoint(g,z,.01*d,new Color(0,0,0,0),DISPLAY.M[3].C,64);
	}
    }

    
    public void drawDivisors(Graphics2D g) {
	double[] xy=getCoords();
	double x=xy[0];
	double y=xy[1];
	double[] s={-3,3};
	double[] t={0,0};
	
        Path2D.Double p=new Path2D.Double();
	for(int i=0;i<2;++i) t[i]=wall1_c3(x,y,s[i]);
	p.moveTo(s[0],t[0]);
	p.lineTo(s[1],t[1]);

	for(int i=0;i<2;++i) t[i]=wall2_c3(x,y,s[i]);
       	p.moveTo(s[0],t[0]);
       	p.lineTo(s[1],t[1]);
	
	for(int i=0;i<2;++i) t[i]=wall3_c3(x,y,s[i]);
       	p.moveTo(s[0],t[0]);
       	p.lineTo(s[1],t[1]);
	p=transform(p);

	if(DIVISOR.L[0].on==1) {
	    g.setColor(DIVISOR.M[0].C);
	    g.draw(p);
	}

	p.reset();

	for(int i=0;i<2;++i) t[i]=wall4_c3(x,y,s[i]);
       	p.moveTo(s[0],t[0]);
       	p.lineTo(s[1],t[1]);
	p=transform(p);
	
	if(DIVISOR.L[1].on==1) {
	    g.setColor(DIVISOR.M[1].C);
	    g.draw(p);
	}
	
	p.reset();
	for(int i=0;i<2;++i) t[i]=wall5_c3(x,y,s[i]);
       	p.moveTo(s[0],t[0]);
	p.lineTo(s[1],t[1]);
	p=transform(p);

	if(DIVISOR.L[2].on==1) {
	    g.setColor(DIVISOR.M[2].C);
	    g.draw(p);
	}

	p.reset();
	for(int i=0;i<2;++i) t[i]=wall6_c3(x,y,s[i]);
       	p.moveTo(s[0],t[0]);
       	p.lineTo(s[1],t[1]);
	p=transform(p);

	if(DIVISOR.L[3].on==1) {
	    g.setColor(DIVISOR.M[3].C);
	    g.draw(p);
	}
	
	p.reset();
	for(int i=0;i<2;++i) t[i]=wall7_c3(x,y,s[i]);
      	p.moveTo(s[0],t[0]);
       	p.lineTo(s[1],t[1]);
	p=transform(p);

	if(DIVISOR.L[4].on==1) {
	    g.setColor(DIVISOR.M[4].C);
	    g.draw(p);
	}

    }






    
    public void drawControls(Graphics2D g) {
	CONTROL.h=100;
	CONTROL.w=getWidth();
	CONTROL.render(g,new Color(0,0,100));
	DISPLAY.render(g,0,0,100);
	DIVISOR.render(g,105,0,80);


	
	g.setColor(new Color(100,200,255));
	g.setFont(new Font("Helvetica",Font.PLAIN,16));
	
	Double D1=Double.valueOf(SOURCE.x);
	Double D2=Double.valueOf(SOURCE.y);
	g.drawString(D1.toString(),210,20);
	g.drawString(D2.toString(),210,40);
	
	g.setColor(Color.yellow);
	double[] xy=getCoords();
	double x=xy[0];
	double y=xy[1];
	Complex z=magicPoint(x,y);	
	D1=Double.valueOf(z.x);
	D2=Double.valueOf(z.y);
	g.drawString(D1.toString(),210,70);
	g.drawString(D2.toString(),210,90);

        POINTSIZE.render(g,Color.blue,Color.white,Color.white);
        g.setFont(new Font("Helvetica",Font.PLAIN,16));
	g.drawString("point size",(int)(POINTSIZE.x),(int)(POINTSIZE.y-8));
	
    }

    public void drawPoints(Graphics2D g) {
  	int k=POINTSIZE.val;
	double d=Math.pow(.5,k);
	for(int i=0;i<COUNT;++i) {
	    fillPoint(g,Z[i],d,new Color(255,255,0),16);
	}
    }
    
    public void drawTri(Graphics2D g) {
	if(TRI==null) return;
	Path2D.Double p=toPath(TRI);
	p=transform(p);
	g.setColor(DISPLAY.M[4].C);
	g.fill(p);
	g.setColor(Color.white);
	g.draw(p);
    }


    public Path2D.Double toPath(Complex[] t) {
	Path2D.Double p=new Path2D.Double();
	p.moveTo(t[0].x,t[0].y);
	p.lineTo(t[1].x,t[1].y);
	p.lineTo(t[2].x,t[2].y);
	p.closePath();
	return p;
    }

    
    public void mousePressed(MouseEvent e) {
      	MouseData J=MouseData.process(e);
	repaint();
    }
    
    public void mouseClicked(MouseEvent e) { 
	MouseData J=MouseData.process(e);
	if(CONTROL.inside(J.X)==1) {
	    DISPLAY.process(J.X,M.C.CS.C);
	    DIVISOR.process(J.X,M.C.CS.C);
	    POINTSIZE.modify(J.X);
	    repaint();
	    return;
	}
	
        if(J.mode==1)  scaleUp(J.X,0);
        if(J.mode==3)  scaleUp(J.X,1);
	if(J.mode==2)  {
	    SOURCE=unTransform(J.X);
	}
    	M.repaint();
    }

    public void mouseDragged(MouseEvent e) { 
    }
    
     public void mouseReleased(MouseEvent e) {	 
     }

     public void mouseEntered(MouseEvent e) {}
     public void mouseExited(MouseEvent e) {}   


    public void mouseMoved(MouseEvent e) {
          MouseData J=MouseData.process(e);
	  requestFocus();
	  JX=J.X;
	  SOURCE=unTransform(J.X);
	  M.repaint();
     }

    
    
    public void keyPressed(KeyEvent e) {
    }
    public void keyReleased(KeyEvent e) {
    }

    
  public void keyTyped(KeyEvent e) {
      COUNT=0;
      repaint();
        TRI[0]=new Complex(0,0);
      TRI[1]=new Complex(0,0);
      TRI[2]=new Complex(0,0);
  }

    
    /**the definition of the cone bundle*/

   public static Complex[] wall1(double x,double y) {
	Complex p12=point12(x,y);
	Complex p13=point13(x,y);
	return extend(p12,p13);
    }

    public static Complex[] wall2(double x,double y) {
	Complex p12=point12(x,y);
	Complex p23=point23(x,y);
	return extend(p12,p23);
    }
    
    public static Complex[] wall3(double x,double y) {
	Complex p13=point13(x,y);
	Complex p23=point23(x,y);
	return extend(p13,p23);
    }
	
    public static double wall1_c3(double x,double y,double c2) {
	double u1=u11(x,y);
	double u2=u12(x,y);
	return u1+u2*c2;
    }

    public static double wall2_c3(double x,double y,double c2) {
	double u1=u21(x,y);
	double u2=u22(x,y);
	return u1+u2*c2;
    }

    public static double wall3_c3(double x,double y,double c2) {
	double u1=u31(x,y);
	double u2=u32(x,y);
	return u1+u2*c2;
    }

    public static double wall4_c3(double x,double y,double c2) {
	double u1=u41(x,y);
	double u2=u42(x,y);
	return u1+u2*c2;
    }

    public static double wall5_c3(double x,double y,double c2) {
	double u1=u51(x,y);
	double u2=u52(x,y);
	return u1+u2*c2;
    }

    public static double wall6_c3(double x,double y,double c2) {
	double u1=u61(x,y);
	double u2=u62(x,y);
	return u1+u2*c2;
    }

    public static double wall7_c3(double x,double y,double c2) {
	double u1=u71(x,y);
	double u2=u72(x,y);
	return u1+u2*c2;
    }


    


public static double u11(double x,double y){
    double a = 4*y*(-2*x + x*x + y*y) /
        ((-1+2*x)*(-2*x + x*x - y*y)*(-2*x + x*x - y*y)*(2*x + x*x + y*y));
    return a;
}

public static double u12(double x,double y){
    return 2 + y/x;
}

    
/** seventh wall coefficients */
public static double u21(double x, double y) {
    double num = 4*x*y*(-2*x + x*x + y*y) *
        (4*x*x - 6*x*x*x + 5*x*x*x*x
         + 2*x*y*y + 6*x*x*y*y + y*y*y*y);
    double den = ((-1+2*x)*(-2*x + x*x - y*y)*(-2*x + x*x - y*y)*
                  (2*x + x*x + y*y)*
                  (-2*x*x*x + x*x*x*x + 6*x*y*y
                   + 2*x*x*y*y + y*y*y*y));
    return num / den;
}


    
/** second wall coefficients (corrected) */
public static double u31(double x, double y) {
    double num = -8*x*x*x*y * (-2*x + x*x + y*y) * (1 - 2*x + 2*x*x + 2*y*y);
    double den = ((-1 + 2*x) * (-2*x + x*x - y*y)*(-2*x + x*x - y*y) * psi1(x,y));
    return num / den;
}

public static double u32(double x, double y) {
    double num = -(-2*x + x*x + y*y) * phi(x,y);
    double den = psi1(x,y);
    return num / den;
}

/** helper polynomials for wall 2 */
public static double phi(double x, double y) {
    return 4*x*x*x - 4*x*x*x*x + 2*x*x*x*x*x
         - 10*x*x*y - 2*x*x*x*y - x*x*x*x*y
         + 4*x*x*y*y + 4*x*x*x*y*y
         - 6*x*y*y*y - 2*x*x*y*y*y
         + 2*x*y*y*y*y - y*y*y*y*y;
}

public static double psi1(double x, double y) {
    return 6*x*x*x*x*x - 5*x*x*x*x*x*x + x*x*x*x*x*x*x
         - 12*x*x*y*y - 10*x*x*x*y*y
         - 7*x*x*x*x*y*y + 3*x*x*x*x*x*y*y
         - 8*x*y*y*y*y - 3*x*x*y*y*y*y
         + 3*x*x*x*y*y*y*y
         - y*y*y*y*y*y + x*y*y*y*y*y*y;
}



    

public static double u22(double x, double y) {
    double num = 4*x*(-2*x + x*x + y*y) *
        (2*x*x - 2*x*x*x + x*x*x*x
         - 2*x*y - x*x*y
         + 2*x*y*y + 2*x*x*y*y
         - y*y*y + y*y*y*y);
    double den = ((2*x + x*x + y*y)*
                  (-2*x*x*x + x*x*x*x + 6*x*y*y
                   + 2*x*x*y*y + y*y*y*y));
    return num / den;
}

/** fourth wall coefficients */
public static double u41(double x, double y) {
    double a = 4*y / ((-1+2*x)*(-2*x + x*x - y*y)*(-2*x + x*x - y*y));
    return a;
}

public static double u42(double x, double y) {
    return (2*x + y) / x;
}

/** fifth wall coefficients */
public static double u61(double x, double y) {
    double a = -8*x*y*(-x + x*x - y*y)*(-2*x + x*x + y*y)*(x + x*x + y*y) /
               ((-1+2*x)*(-2*x + x*x - y*y)*(-2*x + x*x - y*y)*psi3(x,y));
    return a;
}

public static double u62(double x, double y) {
    double num = (-2*x + x*x + y*y) *
        (4*x*x*x - 4*x*x*x*x + 2*x*x*x*x*x
         + 14*x*x*y - 2*x*x*x*y + 3*x*x*x*x*y
         + 4*x*x*y*y + 4*x*x*x*y*y
         + 10*x*y*y*y + 6*x*x*y*y*y
         + 2*x*y*y*y*y + 3*y*y*y*y*y);
    return num / psi3(x,y);
}

/** sixth wall coefficients */
public static double u71(double x, double y) {
    double num = -4*x*y*(-2*x + x*x + y*y) *
        (-4*x*x + 2*x*x*x + x*x*x*x
         - 6*x*y*y - 2*x*x*y*y - 3*y*y*y*y);
    double den = ((-1+2*x)*(-2*x + x*x - y*y)*(-2*x + x*x - y*y)*psi4(x,y));
    return num / den;
}

public static double u72(double x, double y) {
    double num = 4*(-2*x + x*x + y*y) *
        (2*x*x*x - 2*x*x*x*x + x*x*x*x*x
         + 4*x*x*y - x*x*x*y + x*x*x*x*y
         + 2*x*x*y*y + 2*x*x*x*y*y
         + 3*x*y*y*y + 2*x*x*y*y*y
         + x*y*y*y*y + y*y*y*y*y);
    return num / psi4(x,y);
}

/** third wall coefficients */
public static double u51(double x,double y){
    double a = 4*x*y*(2*x - 3*x*x + y*y)*(x*x + y*y)*(-2*x + x*x + y*y) /
           ((-1+2*x)*(2*x - x*x + y*y)*(2*x - x*x + y*y)*
            (-4*x*x*x*x + 12*x*x*x*x*x - 9*x*x*x*x*x*x + 2*x*x*x*x*x*x*x
            -12*x*x*y*y -12*x*x*x*y*y -11*x*x*x*x*y*y + 6*x*x*x*x*x*y*y
            -8*x*y*y*y*y -3*x*x*y*y*y*y + 6*x*x*x*y*y*y*y
            -y*y*y*y*y*y + 2*x*y*y*y*y*y*y));
    return a;
}
public static double u52(double x,double y){
    double a = 2*y*(-2*x + x*x + y*y)*
           (6*x*x + x*x*x*x + 4*x*y*y + 2*x*x*y*y + y*y*y*y) /
           (-4*x*x*x*x + 12*x*x*x*x*x - 9*x*x*x*x*x*x + 2*x*x*x*x*x*x*x
           -12*x*x*y*y -12*x*x*x*y*y -11*x*x*x*x*y*y + 6*x*x*x*x*x*y*y
           -8*x*y*y*y*y -3*x*x*y*y*y*y + 6*x*x*x*y*y*y*y
           -y*y*y*y*y*y + 2*x*y*y*y*y*y*y);
    return a;
}

/** helper polynomials */
public static double psi3(double x, double y) {
    return -8*x*x*x*x + 18*x*x*x*x*x - 13*x*x*x*x*x*x + 3*x*x*x*x*x*x*x
        - 12*x*x*y*y - 14*x*x*x*y*y - 15*x*x*x*x*y*y
        + 9*x*x*x*x*x*y*y - 8*x*y*y*y*y - 3*x*x*y*y*y*y
        + 9*x*x*x*y*y*y*y - y*y*y*y*y*y + 3*x*y*y*y*y*y*y;
}

public static double psi4(double x, double y) {
    return -12*x*x*x*x + 24*x*x*x*x*x - 17*x*x*x*x*x*x + 4*x*x*x*x*x*x*x
        - 12*x*x*y*y - 16*x*x*x*y*y - 19*x*x*x*x*y*y
        + 12*x*x*x*x*x*y*y - 8*x*y*y*y*y - 3*x*x*y*y*y*y
        + 12*x*x*x*y*y*y*y - y*y*y*y*y*y + 4*x*y*y*y*y*y*y;
}



    

    

    public static Complex[] extend(Complex a,Complex b) {
	double d=Complex.dist(a,b);
	d=1+1/d;
	Complex w1=Complex.plus(a.scale(1-d),b.scale(d));
	Complex w2=Complex.plus(b.scale(1-d),a.scale(d));
	Complex[] w={w1,w2};
	return w;
    }

    
    

    
    public static Complex magicPoint(double x,double y) {
	Complex p12=point12(x,y);
	Complex p13=point13(x,y);
	Complex p23=point23(x,y);
	Complex p=Complex.plus(p12,Complex.plus(p13,p23));
	p=p.scale(1.0/3);
	return p;
    }
    

    public static Complex point13(double x,double y) {
	double u11=u11(x,y);
	double u12=u12(x,y);
	double u31=u31(x,y);
	double u32=u32(x,y);
	double cc2=(u11-u31)/(u32-u12);
	double cc3=wall1_c3(x,y,cc2);
	return new Complex(cc2,cc3);
    }

    public static Complex point12(double x,double y) {
	double u11=u11(x,y);
	double u12=u12(x,y);
	double u21=u21(x,y);
	double u22=u22(x,y);
	double cc2=(u11-u21)/(u22-u12);
	double cc3=wall1_c3(x,y,cc2);
	return new Complex(cc2,cc3);
    }
    public static Complex point23(double x,double y) {
	double u21=u21(x,y);
	double u22=u22(x,y);
	double u31=u31(x,y);
	double u32=u32(x,y);
	double cc2=(u21-u31)/(u32-u22);
	double cc3=wall2_c3(x,y,cc2);
	return new Complex(cc2,cc3);
    }


    

}
