import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;






public class ScaleCanvas extends Canvas implements MouseListener, MouseMotionListener {
    Complex SOURCE=new Complex(0,0);
    AffineTransform[] A=new AffineTransform[2];


     public ScaleCanvas() {
	 setScales(100,200);
     }

    public void setScales(int m,int n) {
	A[0]=AffineTransform.getTranslateInstance(m,m);
	A[1]=AffineTransform.getScaleInstance(n,-n);
    }


    public void setScales(int m1,int m2,int n) {
	A[0]=AffineTransform.getTranslateInstance(m1,m2);
	A[1]=AffineTransform.getScaleInstance(n,-n);
    }


    public void setScales(int m1,int m2,int n1,int n2) {
	A[0]=AffineTransform.getTranslateInstance(m1,m2);
	A[1]=AffineTransform.getScaleInstance(n1,-n2);
    }





    /**I added this to fix the flickering problem on
       Pat Hooper's computer.*/
    public void update(Graphics g) {
        Graphics g2;
        Image offscreen = null;
        offscreen = createImage(this.getWidth(),this.getHeight());
        g2 = offscreen.getGraphics();
        paint(g2);
        g.drawImage(offscreen, 0, 0, this);
	g2.dispose();
	offscreen.flush();
    }
    /**end of fix*/


    public void fillPoint(Graphics2D g,Complex z,double r,Color C,int q) {
	fillPoint(g,z,r,C,new Color(0,0,0,0),q);
    }

    public void fillPoint(Graphics2D g,Complex z,double r,Color C1,Color C2,int q) {
	Path2D.Double gp=new Path2D.Double();
	double x=(z.x);
	double y=(z.y);
	for(int i=0;i<=q;++i) {
	    double c=Math.cos(2*Math.PI*i/q);
	    double s=Math.sin(2*Math.PI*i/q);
	    c=r*c+z.x;
	    s=r*s+z.y;
	    if(i==0) gp.moveTo((c),(s));
	    if(i!=0) gp.lineTo((c),(s));
	}
	gp=transform(gp);
	g.setColor(C1);
	g.fill(gp);
	g.setColor(C2);
	g.draw(gp);
    }



    /**This routine fits a plot to the screen.*/
    public static AffineTransform[] preFit(Path2D.Double gp,double x,double y,double w,double h) {
	AffineTransform[] AFF=new AffineTransform[2];
	Rectangle2D R0=gp.getBounds2D();
	Rectangle2D.Double R1=(Rectangle2D.Double)(R0);
	double[] t={R1.x,R1.y,R1.x+R1.getWidth(),R1.y+R1.getHeight()};
	if(t[2]-t[0]<.0000001) return null;
	if(t[3]-t[1]<.0000001) return null;
	 double x1=1.0*(w)/(t[2]-t[0]);
	 double x2=1.0*(h)/(t[3]-t[1]);
	 double sc=x1;
	 if(sc>x2) sc=x2;	 
         AFF[1]=AffineTransform.getScaleInstance(x1,-x2);
	 double cenx=(t[0]+t[2])/2.0;
	 double ceny=(t[1]+t[3])/2.0;
	 double targetx=x+1.0*w/2;
	 double targety=y+1.0*h/2;
	 double xx=targetx-cenx*x1;
	 double yy=targety+ceny*x2;
	 AFF[0]=AffineTransform.getTranslateInstance(xx,yy);
	 return(AFF);
    }






    public void paint(Graphics g2) {}

    public Path2D.Double transform(Path2D.Double H) {
	Path2D.Double HH=new Path2D.Double(H);
	HH.transform(A[1]);   //scale
	HH.transform(A[0]);   //translate
	return(HH);
    }


    public Complex transformDirect(Complex z) {
	double x=A[1].getScaleX();
	double y=A[1].getScaleY();
	double x0=A[0].getTranslateX();
	double y0=A[0].getTranslateY();
	Complex w=new Complex(z.x*x+x0,z.y*y+y0);
	return w;
    }

    

  /**This is a real valued version of the same thing**/
    public Complex unTransform(double tx,double ty) {
       double ux=A[0].getTranslateX();
       double uy=A[0].getTranslateY();
       double sx=A[1].getScaleX();
       double sy=A[1].getScaleY();
       ux=(ux-tx)+tx;
       uy=(uy-ty)+ty;
       tx=tx-ux;
       ty=ty-uy;
       tx=tx/sx;
       ty=ty/sy;
       Complex z=new Complex(tx,ty);
       return(z);
    }


    /**ZOOM: This routine is the companion to the scaling routine.  
       After I have zoomed into the picture in some way, my further
       mouse clicks have different meanings than they did before the
       zoom.  In other words, suppose that I dilate the picture by
       100000.  When I click on the point with pixel value (50,50)
       I really mean to select the number (.00005,.00005). This routine
       changes the pixel value of the point to the intended value.*/

    public Complex unTransform(Point X) {
	double ux=A[0].getTranslateX();
       double uy=A[0].getTranslateY();
       double tx=X.x;
       double ty=X.y;

       double sx=A[1].getScaleX();
       double sy=A[1].getScaleY();
       ux=(ux-tx)+tx;
       uy=(uy-ty)+ty;
       tx=tx-ux;
       ty=ty-uy;
       tx=tx/sx;
       ty=ty/sy;
       return(new Complex(tx,ty));
    }


    /**ZOOM: this routine scales up or down with the mouse click.
       The first argument is the point about which you scale, and
       the second argument just tells you whether to go up or down.
       The basic idea is that I have globally defined some
       AffineTransform objects.  These will rescale a Path2D.Double
       whenever I draw it.  So, I just modify the components of
       these AffineTransforms whenever I do this routine.*/
       



    public void scaleUp(Point X,int k) {

	double scale=Math.pow(2,0.25);
	double ss=scale;
	if(k==1) ss=1/scale;

	double sx=A[1].getScaleX();
	double sy=A[1].getScaleY();
	double tx=X.x;
	double ty=X.y;
	double ux0=A[0].getTranslateX();
	double uy=A[0].getTranslateY();

	double ux1=ss*(ux0-tx)+tx;
	uy=ss*(uy-ty)+ty;
	sx=sx*ss;
        sy=sy*ss;
	A[1]=AffineTransform.getScaleInstance(sx,sy);
	A[0]=AffineTransform.getTranslateInstance(ux1,uy);
	repaint();
    }




    public void drawSource(Graphics2D g) {
	Path2D.Double gp=new Path2D.Double();
	double x=(SOURCE.x);
	double y=(SOURCE.y);
	gp.moveTo((x-.001),(y-.001));
	gp.lineTo((x-.001),(y+.001));
	gp.lineTo((x+.001),(y+.001));
	gp.lineTo((x+.001),(y-.001));
	gp.closePath();
	gp=transform(gp);
	g.setColor(Color.white);
	g.fill(gp);
	g.draw(gp);
    }





    public void mousePressed(MouseEvent e) {}
    public void mouseEntered(MouseEvent e) {}
    public void mouseExited(MouseEvent e) {}
    public void mouseReleased(MouseEvent e) {}
    public void mouseMoved(MouseEvent e) {}
    public void mouseClicked(MouseEvent e) {}
    public void mouseDragged(MouseEvent e) {}



    public void doScale(MouseEvent e,Manager M) {
        MouseData J=MouseData.process(e);
	int mode=J.mode;
        if(mode==1) scaleUp(J.X,-1);
        if(mode==3) scaleUp(J.X,+1);
	if(mode==2) {
            Complex temp=unTransform(J.X);
	    SOURCE=temp;
	}
    }


    public void doScale2(MouseEvent e,Manager M) {
        MouseData J=MouseData.process(e);
	int mode=J.mode;	
	if(mode==2) {
            Complex temp=unTransform(J.X);
	    SOURCE=temp;
	}
    }


    public void doScale(int mode,Point X) {
        if(mode==1) scaleUp(X,-1);
        if(mode==3) scaleUp(X,+1);
	if(mode==2) {
            Complex temp=unTransform(X);
	    SOURCE=temp;
	}
    }


    public void doScale2(int mode, Point X) {
	if(mode==2) {
            Complex temp=unTransform(X);
	    SOURCE=temp;
	}
    }

}

