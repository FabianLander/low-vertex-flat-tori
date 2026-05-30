import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;
import java.util.Arrays;
import java.util.Comparator;


public class PictureCanvas extends ScaleCanvas implements MouseListener, KeyListener, MouseMotionListener {
    Manager M;
    Color COLOR;
    Complex[] CLOUD;
    long PATTERN;
    int VERTEX;
    ListenSquare[] TRI= new ListenSquare[16];
    ListenSquare CONTROL;
    Color[] COL=new Color[16];
    Point JX;
  

     public PictureCanvas() {
	 addMouseListener(this);
	 addMouseMotionListener(this);
	 addKeyListener(this);
	 setScales(100,400,300);
	 COLOR=new Color(255,180,0);
	 CLOUD=TriangulationGeometry.getCloud();
	 PATTERN=0;
	 VERTEX=0;
	 for(int i=0;i<16;++i) TRI[i]=new ListenSquare(0,25*i,20,25);
	 CONTROL=new ListenSquare(0,0,43,400);
     }

   public void paint(Graphics g2) {
      Graphics2D g=(Graphics2D) g2;
      g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
      drawBG(g);
      drawTriangles(g);
      drawVertices(g);
   }

    public void drawBG(Graphics2D g) {
	g.setColor(M.C.DISPLAY.M[0].C);
        g.fillRect(0,0,getWidth(),getHeight());
	Path2D.Double p=new Path2D.Double();
	for(int i=-2;i<3;++i) {
	    for(int j=-2;j<3;++j) {
		p.reset();
		p.moveTo(i,j);
		p.lineTo(i,j+1);
		p.lineTo(i+1,j+1);
		p.lineTo(i+1,j);
		p.closePath();
		p=transform(p);
		g.setColor(Color.blue);
		g.draw(p);
	    }
	}
    }
    
    public void drawTriangles(Graphics2D g) {
	if(M.C.DISPLAY.L[1].on==0) return;
	Complex[] cloud=Arrays.copyOf(CLOUD,CLOUD.length);
	Color COL2=M.C.DISPLAY.M[1].C;
    	int[][] t=TriangulationCombinatorics.tiling();
	int link=1;
         for(int i=0;i<16;++i) {
            Complex[] w=triang(cloud,t[i]);
	    drawTriangExtended(g,w,M.C.COL[i],COL2);
       	}

    }

    public void drawVertices(Graphics2D g) {
	if(M.C.DISPLAY.L[2].on==0) return;
	int n=calculateFont(g);
	Font f=new Font("Helvetica",Font.PLAIN,n);
	Complex[] cloud=Arrays.copyOf(CLOUD,CLOUD.length);
	Color COL1=M.C.DISPLAY.M[2].C;
	Color COL2=Color.black;
	if(COL1.getRed()+COL1.getGreen()+COL1.getBlue()<200) COL2=Color.white;
    	for(int k=0;k<cloud.length;++k) {
	    fillPoint(g,cloud[k],.07,Color.black,32);
	    fillPoint(g,cloud[k],.06,Color.white,32);
	    fillPoint(g,cloud[k],.05,COL1,32);
	    Integer I=Integer.valueOf(cloud[k].label);
	    Complex z0=transformDirect(cloud[k]);
	    drawStringNicely(g,f,I.toString(),(int)(z0.x+1),(int)(z0.y),COL2);
	}
    }

    /**This is the routine I want to beef up.*/
    
    public int calculateFont(Graphics2D g) {
	double s=A[1].getScaleX();
	return (int)(.1*s);
    }
    

    /**draws the labels*/

    public void drawStringNicely(Graphics2D g,Font f,String S,int x0,int y0,Color C) {
	int n=f.getSize();
	int x=x0-n/3;
	int y=y0+n/3;
	g.setFont(f);
	g.setColor(C);
	g.drawString(S,x,y);
    }

    public static int permute(int S) {

	if(S==0) return 0;
	if(S==1) return 6;
	if(S==2) return 3;
	if(S==3) return 5;
	if(S==4) return 2;
	if(S==5) return 4;
	if(S==6) return 1;
	if(S==7) return 7;
	return -1;
    }

    

    /**gets triangles in the universal cover*/

    public static Complex[] triang(Complex[] cloud,int[] t) {
	Complex[] w=new Complex[3];
	w[0]=TriangulationGeometry.inFundamentalSquare(cloud,t[0]);
  	w[1]=TriangulationGeometry.closest(w[0],cloud,t[1]);
	w[2]=TriangulationGeometry.closest(w[0],cloud,t[2]);
	return w;
    }

    /**gets edges in the universal cover*/
    
    public static Complex[] edge(Complex[] cloud,int[] t) {
	Complex[] w=new Complex[2];
	w[0]=TriangulationGeometry.inFundamentalSquare(cloud,t[0]);
  	w[1]=TriangulationGeometry.closest(w[0],cloud,t[1]);
	return w;
    }

    /**draws triangles in the universal cover*/
    
    public void drawTriangExtended(Graphics2D g,Complex[] z,Color COL1,Color COL2) {
	for(int i=-2;i<=2;++i) {
	    for(int j=-2;j<=2;++j) {
	       Path2D.Double p=new Path2D.Double();
	       p.moveTo(z[0].x+i,z[0].y+j);
	       p.lineTo(z[1].x+i,z[1].y+j);
	       p.lineTo(z[2].x+i,z[2].y+j);
	       p.closePath();
	       p=transform(p);
	       g.setColor(COL1);
	       g.fill(p);
	       g.setColor(COL2);
	       g.draw(p);
	    }
	}
    }
	
    /*draws edges in the universal cover*/
    
    public void drawEdgeExtended(Graphics2D g,Complex[] z,Color COL,int thick) {
	for(int i=-2;i<=2;++i) {
       	    for(int j=-2;j<=2;++j) {
	       Path2D.Double p=new Path2D.Double();
	       p.moveTo(z[0].x+i,z[0].y+j);
	       p.lineTo(z[1].x+i,z[1].y+j);
	       p.closePath();
	       p=transform(p);
	       g.setStroke(new BasicStroke(thick));
	       g.setColor(COL);
	       g.draw(p);
	    }
	}
        g.setStroke(new BasicStroke(1));
    }
    

    public void mousePressed(MouseEvent e) { }
    
    public void mouseClicked(MouseEvent e) { 
	MouseData J=MouseData.process(e);
        if(J.mode==1)  scaleUp(J.X,0);
        if(J.mode==3)  scaleUp(J.X,1);
	if(J.mode==2) {
	    SOURCE=unTransform(J.X);
	}
	repaint();
    }

    public void doMouseClick(int mode) { 
        if(mode==1)  scaleUp(JX,0);
        if(mode==3)  scaleUp(JX,1);
	if(mode==2) {
	    SOURCE=unTransform(JX);
	    locateTriangle();
	}
	M.repaint();
    }


    

    public void mouseDragged(MouseEvent e) { 
    }
    
     public void mouseReleased(MouseEvent e) {	 
     }

     public void mouseEntered(MouseEvent e) {
	 requestFocus();
     }
    
     public void mouseExited(MouseEvent e) {}   

     public void mouseMoved(MouseEvent e) {
          MouseData J=MouseData.process(e);
	  JX=J.X;
	  M.C.MESSAGE="Triangulation window.  Zooming z,c.  Coloring x";
	  M.C.repaint();
     }

    
    public void locateTriangle() {
	int[] f=TriangulationGeometry.closestTriangle(SOURCE,CLOUD);
	int t=TriangulationCombinatorics.lookup(f);
	M.C.COL[t]=M.C.CS.C;
    }


    
    public void keyPressed(KeyEvent e) {}
    public void keyReleased(KeyEvent e) {
    }

    
  public void keyTyped(KeyEvent e) {
      char ch=e.getKeyChar();
      
      //zooming and coloring
      if(ch=='z') doMouseClick(1);
      if(ch=='x') doMouseClick(2);
      if(ch=='c') doMouseClick(3);

  }

    
}

