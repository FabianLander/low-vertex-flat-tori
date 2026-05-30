import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;


public class EyeCanvas extends ScaleCanvas implements MouseListener, MouseMotionListener, KeyListener {
    Manager M;
    boolean alive;
    Point JX;
    boolean DRAG;

     public EyeCanvas() {
	 addMouseListener(this);
	 addMouseMotionListener(this);
	 addKeyListener(this);
	 setScales(150,150,100);
	 alive=true;
	 DRAG=false;
     }

   public void paint(Graphics g2) {
      Graphics2D g=(Graphics2D) g2;
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
      drawBG(g);
      drawEye(g);
   }

    public void drawBG(Graphics2D g) {
	g.setColor(Color.black);
        g.fillRect(0,0,getWidth(),getHeight());
    }

    public void drawEye(Graphics2D g) {
	for(int i=1;i<=20;++i) {
	    double t=1.0*i/20;
	    fillPoint(g,new Complex(0,0),t,new Color(0,0,0,0),new Color(0,0,200),100);
	}
	for(int i=1;i<2;++i) {
	    double t=1.0*i/20;
	    fillPoint(g,new Complex(0,0),t,new Color(0,0,255),new Color(50,100,255),100);
	}

	Path2D.Double p=new Path2D.Double();
	p.moveTo(-2,0);
	p.lineTo(+2,0);
	p.moveTo(0,-2);
	p.lineTo(0,+2);
	p=transform(p);
	g.setColor(new Color(0,200,200));
	g.draw(p);

	for(int i=0;i<10;++i) {
	    double t=Math.pow(.25,i);
	    fillPoint(g,SOURCE,.1*t,new Color(0,0,0,0),Color.yellow,300);
	}
    }



    public Matrix getMatrix() {
	double t=SOURCE.norm();
	if(t<.05) return Matrix.identity();
	double s=0;
	if(t<1) s=Math.sqrt(1-t*t);
	Vector V=new Vector(SOURCE.x,SOURCE.y,s);
	Vector W=Vector.cross(V,new Vector(0,0,1));
	Vector X=Vector.cross(V,W);
	Vector[] A={W,X.scale(-1),V};
	Matrix m=new Matrix(A);
	return m;
    }


    public double[] getLevelBounds(Torus T) {
	Vector V=new Vector(0,0,1);
	Matrix m=getMatrix();
	double[] d={1000,-1000};
	for(int i=0;i<8;++i) {
    	   double test=Vector.dot(Matrix.act(m,T.U[i]),V);
	   if(d[0]>test) d[0]=test;
	   if(d[1]<test) d[1]=test;
	}
	return d;
    }

    
    public void mousePressed(MouseEvent e) {

    }
    
    public void doMouseClick(int mode) {
        if(mode==1)  scaleUp(JX,0);
        if(mode==3)  scaleUp(JX,1);
	if(mode==2)  SOURCE=unTransform(JX);
	if(SOURCE.norm()>1) SOURCE=SOURCE.unit();
	M.repaint();
    }
    
    public void mouseClicked(MouseEvent e) { 
	MouseData J=MouseData.process(e);
        if(J.mode==1)  scaleUp(J.X,0);
        if(J.mode==3)  scaleUp(J.X,1);
	if(J.mode==2)  SOURCE=unTransform(J.X);
	if(SOURCE.norm()>1) SOURCE=SOURCE.unit();
	M.repaint();
    }

    public void mouseDragged(MouseEvent e) { 
	MouseData J=MouseData.process(e);
        if(J.mode==1)  scaleUp(J.X,0);
        if(J.mode==3)  scaleUp(J.X,1);
	if(J.mode==2)  SOURCE=unTransform(J.X);
	if(SOURCE.norm()>1) SOURCE=SOURCE.unit();
	M.repaint();
    }
    
     public void mouseReleased(MouseEvent e) {	 
     }

     public void mouseEntered(MouseEvent e) {}
     public void mouseExited(MouseEvent e) {}   


    public void mouseMoved(MouseEvent e) {
          MouseData J=MouseData.process(e);
	  JX=J.X;
	  if(DRAG==true) SOURCE=unTransform(J.X);
	  M.C.MESSAGE="Eye window.  Zooming z,c.  View selection x";
	  M.C.repaint();
     }

    
    
    public void keyPressed(KeyEvent e) {
	DRAG=true;
    }
    public void keyReleased(KeyEvent e) {
	DRAG=false;
    }

    
  public void keyTyped(KeyEvent e) {
      char ch=e.getKeyChar();
      
      //zooming and coloring
      if(ch=='z') doMouseClick(1);
      if(ch=='x') doMouseClick(2);
      if(ch=='c') doMouseClick(3);

  }

}
